import admin from "firebase-admin";
import fs from "fs";

// 🚀 1. 讀取金鑰 (請確認路徑與名稱正確)
const serviceAccount = JSON.parse(fs.readFileSync("./firebase-key.json", "utf-8"));
const NOTION_TOKEN = "notion金鑰要用再貼".trim();
const DATABASE_ID = "30d9a280-04ff-8005-959a-ee18dfa184b2".trim();

// 🌟 新增：你的 Firebase Storage 網址 (去 Firebase 主控台 -> Storage 看，通常是 "你的專案ID.appspot.com")
const STORAGE_BUCKET = "travel-app-29a9b.firebasestorage.app"; 

// 初始化 Firebase
if (!admin.apps.length) {
  admin.initializeApp({ 
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET // 🌟 告訴 Admin SDK 圖片要丟到哪裡
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket(); // 🌟 取得 Storage 操作權限
db.settings({ ignoreUndefinedProperties: true });

// 🌟 新增：下載 Notion 圖片並轉存到 Firebase Storage 的神兵利器
async function uploadNotionImageToFirebase(notionUrl, pageId) {
  try {
    console.log(`   ⏳ 正在轉存圖片至 Firebase...`);
    const res = await fetch(notionUrl);
    if (!res.ok) throw new Error("圖片下載失敗");
    
    const buffer = await res.arrayBuffer();
    // 💡 巧思：用行程的 pageId 當作檔名。這樣以後你重複執行 sync() 時，它只會覆蓋同一張圖，不會浪費你的雲端空間！
    const file = bucket.file(`schedules/${pageId}.jpg`); 
    
    await file.save(Buffer.from(buffer), {
      metadata: { contentType: "image/jpeg" }
    });
    
    // 產生永久公開網址
    const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
    return permanentUrl;
  } catch (error) {
    console.error(`   ❌ 圖片轉存失敗:`, error.message);
    return notionUrl; // 如果萬一失敗了，先退回使用原本的 Notion 網址，讓程式不會崩潰
  }
}

async function sync() {
  try {
    console.log("🚀 正在連線至 Notion 抓取資料...");

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ page_size: 100 })
    });

    const result = await response.json();
    const pages = result.results;

    if (!pages) {
      console.error("❌ 找不到資料，請檢查 Database ID 或權限！");
      return;
    }

    console.log(`📊 成功讀取到 ${pages.length} 筆行程，開始深度解析欄位...`);

    let successCount = 0;
    let missingUrlCount = 0;

    for (const page of pages) {
      const p = page.properties;
      const title = p.Name?.title[0]?.plain_text || "未命名行程";

      // --- 🏆 終極網址解析邏輯 ---
      let googleMapsUrl = "";
      const placeProp = p["Place"] || p["place"] || p["Google連結"];

      if (placeProp) {
        if (placeProp.type === "url" && placeProp.url) {
          googleMapsUrl = placeProp.url;
        } else if (placeProp.type === "rich_text" && placeProp.rich_text.length > 0) {
          googleMapsUrl = placeProp.rich_text[0].plain_text || placeProp.rich_text[0].href || "";
        } else if (placeProp.type === "formula" && placeProp.formula) {
          googleMapsUrl = placeProp.formula.string || "";
        }
      }

      if (googleMapsUrl) googleMapsUrl = googleMapsUrl.trim();

      if (!googleMapsUrl && title !== "未命名行程") {
        console.log(`⚠️ 警告：行程 [${title}] 抓不到網址！`);
        missingUrlCount++;
      }

      // --- 🖼️ 圖片解析與轉存邏輯 (🌟 核心修改區塊) ---
      let imageUrl = "";
      if (p["照片"]?.files?.length > 0) {
        const fileObj = p["照片"].files[0];
        if (fileObj.file?.url) {
          // ⚠️ 抓到 Notion 暫時網址！啟動轉存機制
          imageUrl = await uploadNotionImageToFirebase(fileObj.file.url, page.id);
        } else if (fileObj.external?.url) {
          // ✅ 如果你在 Notion 是貼外部連結，它本身就是永久的，直接用
          imageUrl = fileObj.external.url;
        }
      } else if (p["照片"]?.rich_text?.length > 0) {
        imageUrl = p["照片"].rich_text[0].plain_text || "";
      }

      // --- 🕒 時間解析邏輯 ---
      const timeRaw = p.出發時間?.date?.start || "";
      const timeStr = timeRaw.includes("T") ? timeRaw.split("T")[1].substring(0, 5) : "00:00";

      // --- 寫入 Firebase 的資料物件 ---
      const data = {
        title: title,
        day: p["行程日"]?.multi_select?.[0]?.name || "預備清單",
        time: timeStr,
        location: p["地址/連結"]?.rich_text?.[0]?.plain_text || "",
        googleMapsUrl: googleMapsUrl, 
        imageUrl: imageUrl, // 🏆 這裡現在寫入的會是 Firebase 永久網址囉！
        tags: p.行程類型?.multi_select?.map(t => t.name) || [],
        status: p.行程狀態?.status?.name || "確定去"
      };

      await db.collection("schedules").doc(page.id).set(data);
      successCount++;
    }
    
    console.log(`\n🎉 同步完成！共寫入 ${successCount} 筆資料。`);
    if (missingUrlCount > 0) {
      console.log(`🚨 注意：有 ${missingUrlCount} 筆行程沒有抓到地圖網址。`);
    }

  } catch (err) {
    console.error("❌ 執行失敗：", err.message);
  }
}

sync();