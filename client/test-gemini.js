const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcode the key here just for the test script to be 100% sure
// User provided: AIzaSyBWfAHrMeIXc5cSV-cqnc_a5h_y7EB7Ftw
const apiKey = "AIzaSyBWfAHrMeIXc5cSV-cqnc_a5h_y7EB7Ftw";

async function test() {
    console.log("Testing API Key:", apiKey.slice(0, 10) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Attempting to list models...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        // There isn't a direct "list models" in the easy SDK, usually we just try a generation.
        // But let's try a very basic 'gemini-pro' generation again to be sure.
        // Actually, let's try to print the error JSON fully.

        const result = await model.generateContent("Test");
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("FAILURE! Full Error Object:");
        console.error(JSON.stringify(error, null, 2));

        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error("Response Body:", await error.response.text());
        }
    }
}

test();
