const {
    notifyDeletedMessagesToAdmin,
} = require('../helpers/notification/admin/MetaMessageDeleted');

// [
//   {
//     id: 'm_9IN6sH99pnN63hoJ9pLtvA4GEU9cJxAwdWqk2cMiK5O3on4vHUURvop6j8lmy0hCEpgWwGXcfgt5T-YnzpQrug',
//     message: 'Hafiz Uddin ,\n' +
//       'খরচটা নির্ভর করবে আপনার ক্যাবিনেট এরিয়া এবং কেমন সার্ফেস দিয়ে কাজ করবেন তার উপর।    বিস্তারিত জানতে আমাদের কনসালটেন্ট এর সাথে 01949-654499 কথা বলে জানতে পারেন।',
//     created_time: '2025-04-24T02:57:50+0000',
//     from: {
//       name: 'Solution Provider',
//       email: '2078095355564923@facebook.com',
//       id: '2078095355564923'
//     }
//   },
//   {
//     id: 'm_0x4h8N53LhZL2LSxUnfrzw4GEU9cJxAwdWqk2cMiK5N6K60QXgG563OWiz7Jzv7bYtuyY0LG_2ViUjd5GGPLVQ',
//     message: 'কিচেন ক্যাবিনেট করাতে কত টাকা খরচ হবে?',
//     created_time: '2025-04-24T02:57:48+0000',
//     from: {
//       name: 'Hafiz Uddin',
//       email: '24969930062652273@facebook.com',
//       id: '24969930062652273'
//     }
//   },
//   {
//     id: 'm_q_FJC70TOGxXq6cTrTz2xw4GEU9cJxAwdWqk2cMiK5PXdQ8ZflNpQ7VXt-jxvlZxb9t3hGwoELCXKZF968JT7w',
//     message: 'আসসালামু আলাইকুম Hafiz! ইন্টেরিয়র সংশ্লিষ্ট যে কোন প্রয়োজনে ফোন করুন +8801      1949-654499',
//     created_time: '2025-04-24T02:57:47+0000',
//     from: {
//       name: 'Solution Provider',
//       email: '2078095355564923@facebook.com',
//       id: '2078095355564923'
//     }
//   },
//   {
//     id: 'm_NFykORtmFT5UrbuOUAhO0Q4GEU9cJxAwdWqk2cMiK5P09yVyICj2xKFk-94gCvD1jXDwuGy779mhl_8P5dgojg',
//     message: 'Hafiz Uddin replied to an ad.',
//     created_time: '2025-04-24T02:57:47+0000',
//     from: {
//       name: 'Solution Provider',
//       email: '2078095355564923@facebook.com',
//       id: '2078095355564923'
//     }
//   }
// ]
// [
//   {
//     messageId: 'm_nWs-9qTJuEMoVpCblcV8QhG60t7PebdgKSKdxsmybyrzzSG101fHp5o4uA9ReKz045r7nP50nHfXUVm_hIV_Bw',
//     content: 'আমি কিচেন ক্যাবিনেটের কাজ করাতে চাই...',
//     senderId: '9937828096228162',
//     isAutomatedMessage: false,
//     sentByMe: false,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-23T19:07:00.000Z,
//     _id: new ObjectId('68093a83cc3e584a88e923e2')
//   },
//   {
//     messageId: 'm_JQtJHN_HtAQdN9A9-P8MKBG60t7PebdgKSKdxsmybypoOGiYhCelZ1_iHhWYIOvqlaiJmiNdn6ddWIviKdc1-Q',
//     content: 'Assalamualaikom',
//     senderId: '9937828096228162',
//     isAutomatedMessage: false,
//     sentByMe: false,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-23T19:07:00.000Z,
//     _id: new ObjectId('68093a83cc3e584a88e923e3')
//   },
//   {
//     messageId: 'm_m0AvEfXq3nkKAT9x322SJhG60t7PebdgKSKdxsmybyoKM1-v_sHPg_mezeMtf96kngOqOshFZfQmpQWHyXkm4w',
//     content: 'Ki rokom khoros hobe',
//     senderId: '9937828096228162',
//     isAutomatedMessage: false,
//     sentByMe: false,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-23T19:07:00.000Z,
//     _id: new ObjectId('68093a83cc3e584a88e923e4')
//   },
//   {
//     messageId: 'm_iyZbQNnpJ14gvWO7JDKPYRG60t7PebdgKSKdxsmybyrlO4Z93OrdTBIoHrtai7SOu8-Omqw0H9GqtCsHnXniAg',
//     content: 'Mohin Uddin Khan আপনাকে অসংখ্য ধন্যবাদ আমাদের সাথে যোগাযোগ করার জন্য,\n' +
//       'আপনি আপনার মোবাইল নাম্বার শেয়ার করতে পারেন অথবা সরাসরি আমাদের একজন পরামর্শক এর সা াথে এই +8801329709881 নম্বরে কথা বলতে পারেন।\n' +
//       'ধন্যবাদ',
//     senderId: '2078095355564923',
//     isAutomatedMessage: false,
//     sentByMe: true,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-23T19:07:00.000Z,
//     _id: new ObjectId('68093a83cc3e584a88e923e5')
//   },
//   {
//     messageId: 'm_YJb2PDKQPoC7LfDRo1fpsRG60t7PebdgKSKdxsmybyow7i3lyvmk3G1NaHOHD_-CKTFkljRmj9aF7lgeN1xVIA',
//     content: '00393278836109',
//     senderId: '9937828096228162',
//     isAutomatedMessage: false,
//     sentByMe: false,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-23T19:08:00.000Z,
//     _id: new ObjectId('68093a9ccc3e584a88eeed2a')
//   },
//   {
//     messageId: 'm_Qql3AB9qPgN53coxuyvHaRG60t7PebdgKSKdxsmybyp8wbBT64Q3baG9Ezm0KkcWAuTw7U8vzcAO_ceoy_T_0g',
//     content: 'ধন্যবাদ স্যার, আমাদের ফ্রন্ট লাইন থেকে আপনার সাথে যোগাযোগ করা হবে ইনশাআল্ল    লাহ।',
//     senderId: '2078095355564923',
//     isAutomatedMessage: false,
//     sentByMe: true,
//     fileUrl: [],
//     isSticker: false,
//     isAiMessage: false,
//     date: 2025-04-24T02:04:00.000Z,
//     _id: new ObjectId('6809cab2d4935c64056ec84a')
//   }
// ]

const metaDeletedMessageAllart = async (processedMessages, lead, io) => {
    // Return early if lead or lead.messages is null/undefined
    if (!lead?.messages) {
        console.log('Lead or lead messages not found');
        return;
    }

    // create a copy of lead messages
    const crmMessage = [...lead.messages];

    // Remove duplicates based on messageId
    const uniqueCRMMessages = crmMessage.filter(
        (message, index, self) => index === self.findIndex((m) => m.id === message.messageId)
    );

    if (processedMessages?.length < 25 && processedMessages?.length < uniqueCRMMessages.length) {
        console.log('Some Messages deleted from meta for', lead.name);

        // Mark messages as deleted that are not in processedMessages
        lead.messages.forEach((message) => {
            if (!processedMessages.find((pm) => pm.id === message.messageId)) {
                // eslint-disable-next-line no-param-reassign
                message.isDeleted = true;
            }
        });

        // Notify admins about deleted messages
        await notifyDeletedMessagesToAdmin(lead, io);
    }
};

module.exports = {
    metaDeletedMessageAllart,
};
