require("dotenv").config();
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = process.env.ADMIN_ID;

const bot = new TelegramBot(TOKEN, { polling: true });

let state = {};
// kerakli sorovlarimiz
const inputs = {
  basic: [
    { key: "name", question: "Ismingizni kiriting:" },
    { key: "title", question: "Lavozimingizni kiriting:" },
    { key: "location", question: "Joylashuvingizni kiriting:" },
    { key: "phone", question: "Telefon raqamingizni kiriting:" },
    { key: "email", question: "Emailingizni kiriting:" },
    { key: "summary", question: "O'zingiz haqida qisqacha yozing:" },
    { key: "linkedin", question: "LinkedIn linkini kiriting:" },
    { key: "github", question: "Github linkini kiriting:" },
    { key: "website", question: "Website linkini kiriting (agar bo'lsa):" },
  ],
  professional_uz: [
    { key: "name", question: "Ismingizni kiriting:" },
    { key: "title", question: "Lavozimingizni kiriting:" },
    { key: "location", question: "Joylashuvingizni kiriting:" },
    { key: "phone", question: "Telefon raqamingizni kiriting:" },
    { key: "email", question: "Emailingizni kiriting:" },
    { key: "linkedin", question: "LinkedIn linkini kiriting:" },
    { key: "github", question: "Github linkini kiriting:" },
    { key: "website", question: "Website linkini kiriting (agar bo'lsa):" },
    { key: "summary", question: "O'zingiz haqingizda batafsil ma'lumot :" },
    { key: "skills", question: "Skills (vergul bilan):" },
    {
      key: "experience",
      question:
        "Tajriba (misol: 2023-2024 | Kompaniya nomi | Frontend | ixtiyoriy ):",
    },
    {
      key: "education",
      question: "Ta'lim (misol: 2020-2024 | BUXDU | Bakalavr):",
    },
    { key: "projects", question: "Loyihalar (vergul bilan):" },
  ],
  professional_eng: [
    { key: "name", question: "Enter your name:" },
    { key: "title", question: "Enter your job title:" },
    { key: "location", question: "Enter your location:" },
    { key: "phone", question: "Enter your phone number:" },
    { key: "email", question: "Enter your email:" },
    { key: "linkedin", question: "Enter your LinkedIn link:" },
    { key: "github", question: "Enter your GitHub link:" },
    { key: "website", question: "Enter your website link (if any):" },
    { key: "summary", question: "Write a short summary about yourself:" },
    { key: "skills", question: "List your skills (comma separated):" },
    {
      key: "experience",
      question: "Enter your experience (year | company | role | description):",
    },
    {
      key: "education",
      question: "Enter your education (year | institution | degree):",
    },
    { key: "projects", question: "Enter your projects (comma separated):" },
  ],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// start bosganimizda
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    ADMIN,
    `TelegramId :${chatId} User: ${msg.chat.first_name} start bosdi`
  );
  bot.sendMessage(
    chatId,
    `Assalomu aleykum hurmatli ${msg.chat.first_name}!\nQuyidagi bo'limlardan birini tanlang:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Resume turlari", callback_data: "type" }],
          [{ text: "Resume yaratish", callback_data: "start" }],
          [{ text: "Qo'llanma", callback_data: "docs" }],
          [{ text: "Yordam", callback_data: "help" }],
        ],
      },
    }
  );
});
// help boganda
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Yordam kerak bo'lsa adminga murojaat qiling:\n Admin: @Aslonov_Davronbek"
  );
});

// start bossa keyingi keyboardlar chiqishi
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "start") {
    bot.sendMessage(chatId, "Yaratmoqchi bo'lgan resume turini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Minimal uslubdagi resume", callback_data: "basic" }],
          [
            {
              text: "Professional uslubdagi resume (uz)",
              callback_data: "professional_uz",
            },
          ],
          [
            {
              text: "Professional style resume (eng)",
              callback_data: "professional_eng",
            },
          ],
        ],
      },
    });
  }

  if (["basic", "professional_uz", "professional_eng"].includes(query.data)) {
    state[chatId] = {
      template: query.data,
      step: 0,
      data: {},
    };
    bot.sendMessage(chatId, inputs[query.data][0].question);
  }

  if (query.data === "type") {
    bot.sendPhoto(chatId, "./images/resume-basic.jpg", {
      caption: "Minimal uslubdagi resume 📝",
    });
    await delay(500);
    bot.sendPhoto(chatId, "./images/resume-eng.jpg", {
      caption: "Professional eng resume 📝",
    });
    await delay(500);
    bot.sendPhoto(chatId, "./images/resume-uz.jpg", {
      caption: "Professional uz resume 📝",
    });
  }

  if (query.data === "docs") {
    bot.sendMessage(
      chatId,
      "1) Resume turlari bilan tanishing\n2) Resume yaratish tugmasini bosing\n3) Resume turini tanlang\n4) Ma'lumotlaringizni kiriting\n5) PDF hosil bo'ladi"
    );
  }

  if (query.data === "help") {
    bot.sendMessage(
      chatId,
      "Yordam kerak bo'lsa adminga murojaat qiling:\n Admin: @Aslonov_Davronbek"
    );
  }

  bot.answerCallbackQuery(query.id);
});

// asosiy logik qismi, inputlar bilan ishlangan state saqlab pdf generate qismi
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const first_name = msg.chat.first_name;
  if (!state[chatId]) return;

  const userState = state[chatId];
  const currentStep = userState.step;

  const currentInput = inputs[userState.template][currentStep];
  if (!currentInput) return;
  userState.data[currentInput.key] = text;

  userState.step++;

  if (userState.step < inputs[userState.template].length) {
    const nextQuestions = inputs[userState.template][userState.step].question;
    bot.sendMessage(chatId, nextQuestions);
  } else {
    // PDF yaratish qismi
    const typingInterval = setInterval(() => {
      bot.sendChatAction(chatId, "upload_document");
    }, 3000);

    const editMsg = await bot.sendMessage(chatId, "Resume tayyorlanmoqda⏳...");

    const templateName = userState.template;
    const htmlPath = path.join(__dirname, "templates", `${templateName}.html`);

    let html = fs.readFileSync(htmlPath, "utf-8");

    // Ma'lumotlarni HTMLga qo'yish
    for (let key in userState.data) {
      html = html.replaceAll(`{{${key}}}`, userState.data[key]);
    }

    // Puppeteer browser ishga tushirish
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // PDFni buffer orqali yaratish (fayl saqlamasdan)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // PDFni foydalanuvchiga yuborish
    await bot.sendDocument(
      chatId,
      pdfBuffer,
      {},
      { filename: `resume-${first_name}.pdf` }
    );

    // PDFni adminga yuborish
    await bot.sendDocument(
      ADMIN,
      pdfBuffer,
      {},
      { filename: `resume-${first_name}.pdf` }
    );

    clearInterval(typingInterval);

    bot.editMessageText("PDF tayyor ✅", {
      chat_id: chatId,
      message_id: editMsg.message_id,
    });
  }
});
