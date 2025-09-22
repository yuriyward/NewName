Hybrid AI prompting with Firebase AI Logic | AI on Chrome | Chrome for Developers

===============
*   On this page
*   [Build a hybrid AI experience](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#build_a_hybrid_ai_experience)
*   [Get started with Firebase](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#get_started_with_firebase)
    *   [Install the SDK](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#install_the_sdk)

*   [Use Firebase AI Logic](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#use_firebase_ai_logic)
*   [Demo](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#demo)
*   [Participate and share feedback](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#participate_and_share_feedback)

*   [Home](https://developer.chrome.com/?authuser=4)
*    [Docs](https://developer.chrome.com/docs?authuser=4)
*    [AI on Chrome](https://developer.chrome.com/docs/ai?authuser=4)
*    [Built-in](https://developer.chrome.com/docs/ai/built-in?authuser=4)

Hybrid AI prompting with Firebase AI Logic

bookmark_border bookmark Stay organized with collections  Save and categorize content based on your preferences.
============================================================================================================================================================

*   On this page
*   [Build a hybrid AI experience](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#build_a_hybrid_ai_experience)
*   [Get started with Firebase](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#get_started_with_firebase)
    *   [Install the SDK](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#install_the_sdk)

*   [Use Firebase AI Logic](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#use_firebase_ai_logic)
*   [Demo](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#demo)
*   [Participate and share feedback](https://developer.chrome.com/docs/ai/firebase-ai-logic?authuser=4#participate_and_share_feedback)

![Image 3: Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg?authuser=4)

 Thomas Steiner

[](https://github.com/tomayac)[](https://www.linkedin.com/in/thomassteinerlinkedin)[](https://toot.cafe/@tomayac)[](https://bsky.app/profile/tomayac.com)[](https://blog.tomayac.com/)

Published: May 20, 2025

To meet your users' needs, whatever platform or hardware they use, you can set up a fallback to the cloud with Firebase AI Logic for the built-in [Prompt API](https://developer.chrome.com/docs/ai/prompt-api?authuser=4).

**Note:** Firebase AI Logic is available as an experimental release and shouldn't be run in production. See the official [Firebase documentation](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference?authuser=4) for the complete details.
Build a hybrid AI experience
----------------------------

[Built-in AI](https://developer.chrome.com/docs/ai/built-in?authuser=4) comes with a [number of benefits](https://developer.chrome.com/docs/ai/built-in?authuser=4#benefits-on-device), most notably:

*   **Local processing of sensitive data:** If you work with sensitive data, you can offer AI features to users with end-to-end encryption.
*   **Offline AI usage:** Your users can access AI features, even when they're offline or have lapsed connectivity

While these benefits don't apply to cloud applications, you can ensure a seamless experience for those who cannot access built-in AI.

**Caution:** When you fallback to the cloud, there may be legal or functional consequences for your application. If you process sensitive information, be sure to make the appropriate terms and conditions available for user review and consent.
Get started with Firebase
-------------------------

1.   [Create a Firebase project](https://console.firebase.google.com/?_gl=1%2Awwzp3b%2A_ga%2AMTI4NTE3Mzg2Ny4xNzQ3MDUzNzYx%2A_ga_CW55HF8NVT%2AczE3NDcwNTM1NjgkbzEkZzEkdDE3NDcwNTM3NjEkajM1JGwwJGgw&authuser=4) and register your web application.
2.   Read the [Firebase JavaScript SDK documentation](https://firebase.google.com/docs/web/setup?authuser=4) to continue your web application setup.

Firebase projects create a Google Cloud project, with Firebase-specific configurations and services. Learn more about [Google Cloud and Firebase](https://firebase.google.com/docs/projects/learn-more?authuser=4#firebase-cloud-relationship).

### Install the SDK

This workflow uses npm and requires module bundlers or JavaScript framework tooling. Firebase AI Logic is optimized to work with module bundlers to eliminate unused code and decrease SDK size.

\`\`\`
npm install firebase
\`\`\`

Once installed, [initialize the Firebase in your application](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference?api=dev&authuser=4#add-sdk).

Use Firebase AI Logic
---------------------

Once Firebase is installed and initialized, choose either the Gemini Developer API or the Vertex AI Gemini API, then [initialize and create an instance](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference?api=dev&authuser=4#initialize-service-and-model).

Once initialized, you can prompt the model with text or multimodal input.

**Note:** The following examples demonstrate [streaming LLM responses](https://developer.chrome.com/docs/ai/streaming?authuser=4), so you can work with chunks of output as received or the complete response.
#### Text prompts

You can use plain text for your instructions to the model. For example, you could ask the model to tell you a joke.

To ensure that built-in AI is used when available in the `getGenerativeModel` function, set `mode` to `prefer_on_device`.

\`\`\`
// Initialize the Google AI service.
const googleAI = getAI(firebaseApp);

// Create a `GenerativeModel` instance with a model that supports your use case.
const model = getGenerativeModel(googleAI, { mode: 'prefer_on_device' });

const prompt = 'Tell me a joke';

const result = await model.generateContentStream(prompt);

for await (const chunk of result.stream) {
  const chunkText = chunk.text();
  console.log(chunkText);
}
console.log('Complete response', await result.response);
\`\`\`

#### Multimodal prompts

You can also prompt with image or audio, in addition to text. You could tell the model to describe an image's contents or transcribe an audio file.

Images need to be passed as a base64-encoded string as a Firebase `FileDataPart` object, which you can do with the helper function `fileToGenerativePart()`.

\`\`\`
// Converts a File object to a `FileDataPart` object.
// https://firebase.google.com/docs/reference/js/vertexai.filedatapart
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });

    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  const fileInputEl = document.querySelector('input[type=file]');

  fileInputEl.addEventListener('change', async () => {
    const prompt = 'Describe the contents of this image.';

    const imagePart = await fileToGenerativePart(fileInputEl.files[0]);

    // To generate text output, call generateContent with the text and image
    const result = await model.generateContentStream([prompt, imagePart]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
    }
    console.log(Complete response: ', await result.response);
  });
\`\`\`

Demo
----

Visit the [Firebase AI Logic demo](https://chrome.dev/web-ai-demos/firebase-ai-logic/) on different devices and browsers. You can see how the model response comes from either the built-in AI model or the cloud.

When on supported hardware in Chrome, the demo uses the Prompt API and Gemini Nano. There are only 3 requests made for the main document, the JavaScript file, and the CSS file.

![Image 4: Firebase AI logic running in Chrome, using the built-in AI APIs.](https://developer.chrome.com/static/docs/ai/firebase-ai-logic/chrome.png?authuser=4)

When in another browser or an operating system without built-in AI support, there is an additional request made to the Firebase endpoint, `https://firebasevertexai.googleapis.com`.

![Image 5: Firebase AI logic running in Safari, making a request to Firebase servers.](https://developer.chrome.com/static/docs/ai/firebase-ai-logic/safari.png?authuser=4)

Participate and share feedback
------------------------------

Firebase AI Logic can be a great option to integrate AI capabilities to your web apps. By providing a fallback to the cloud when the Prompt API is unavailable, the SDK ensures wider accessibility and reliability of AI features.

Remember that cloud applications create new expectations for privacy and functionality, so it's important to inform your users of where their data is being processed.

*   For feedback on Chrome's implementation, file a [bug report](https://issues.chromium.org/issues/new?component=1617227&priority=P2&type=bug&template=0&noWizard=true) or a [feature request](https://issues.chromium.org/issues/new?component=1617227&priority=P2&type=feature_request&template=0&noWizard=true).
*   For feedback on Firebase AI Logic, file a [bug report](https://github.com/firebase/firebase-js-sdk/issues).

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies?authuser=4). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-05-20 UTC.

 [[["Easy to understand","easyToUnderstand","thumb-up"],["Solved my problem","solvedMyProblem","thumb-up"],["Other","otherUp","thumb-up"]],[["Missing the information I need","missingTheInformationINeed","thumb-down"],["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"],["Out of date","outOfDate","thumb-down"],["Samples / code issue","samplesCodeIssue","thumb-down"],["Other","otherDown","thumb-down"]],["Last updated 2025-05-20 UTC."],[],[],null,[]]
