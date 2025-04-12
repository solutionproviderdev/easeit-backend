const { default: axios } = require('axios');

const sendTextWaMessage = async (req, res) => {
    // Extract the entire payload from the request body
    const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.number,
        type: 'text',
        text: {
            preview_url: false,
            body: req.body.message,
        },
    };

    const config = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization,
        },
    };

    try {
        // Making the POST request to the WhatsApp API
        const response = await axios.post(
            'https://graph.facebook.com/v19.0/319212377938164/messages',
            data,
            config
        );
      //  console.log('Message sent:', response.data);
        res.status(200).json({
            message: 'WhatsApp message sent successfully!',
            data: response.data,
        });
    } catch (error) {
      //console.error(
            'Error sending message:',
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: 'Failed to send message',
            details: error.response ? error.response.data : error.message,
        });
    }
};

const sendImageWaMessage = async (req, res) => {
    const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.number,
        type: 'image',
        image: {
            link: req.body.image,
        },
    };
    const config = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization, // Make sure this contains 'Bearer <token>'
        },
    };
    try {
        const response = await axios.post(
            'https://graph.facebook.com/v19.0/254356777772230/messages',
            data,
            config
        );
      //  console.log('Message sent successfully:', response.data);
        res.status(200).json({
            message: 'WhatsApp image message sent successfully!',
            data: response.data,
        });
    } catch (error) {
      //console.error(
            'Error sending image message:',
            error.response ? JSON.stringify(error.response.data, null, 2) : error
        );
        res.status(500).json({
            error: 'Failed to send image message',
            details: error.response ? error.response.data : error,
        });
    }
};

const sendTemplateWaMessage = async (req, res) => {
    // Check if an image was uploaded and create a URL for it

    // const imageUrl = req.file
    //     ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    //     : null;
    // if (!imageUrl) {
    //     return res.status(400).send('No image uploaded.');
    // }

  console.log(        { number: req.body.number },
        { name: req.body.name },
        { message: req.body.templateName },
        { image: req.body.image }
    );

    const data = {
        messaging_product: 'whatsapp',
        to: req.body.number,
        type: 'template',
        template: {
            name: req.body.templateName,
            language: {
                code: 'en_US',
            },
            components: [
                {
                    type: 'header',
                    parameters: [
                        {
                            type: 'image',
                            image: {
                                // link: 'https://images.pexels.com/photos/162520/farmer-man-shepherd-dog-162520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
                                link: req.body.image,
                            },
                        },
                    ],
                },
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: req.body.name,
                        },
                        {
                            type: 'text',
                            text: req.body.paragraph,
                        },
                    ],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: 1,
                    parameters: [
                        {
                            type: 'text',
                            text: 'Call us now',
                        },
                    ],
                },
            ],
        },
    };

    const config = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization,
        },
    };

    try {
        const response = await axios.post(
            'https://graph.facebook.com/v19.0/254356777772230/messages',
            data,
            config
        );
      //  console.log('Message sent:', response.data);
        res.status(200).json({
            message: 'WhatsApp message sent successfully!',
            data: response.data,
        });
    } catch (error) {
      //console.error(
            'Error sending message:',
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: 'Failed to send message',
            details: error.response ? error.response.data : error.message,
        });
    }
};

module.exports = { sendTextWaMessage, sendImageWaMessage, sendTemplateWaMessage };
