The Prompt API | AI on Chrome | Chrome for Developers

===============
*   On this page
*   [Use the Prompt API](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#use_the_prompt_api)
    *   [Model parameters](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#model_parameters)
    *   [Create a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#create_a_session)
    *   [Add context with initial prompts](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#add_context_with_initial_prompts)
    *   [Session persistence and limits](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#persistence-limits)
    *   [Pass a JSON Schema](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#pass_a_json_schema)
    *   [Clone a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#clone_a_session)
    *   [Prompt the model](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#prompt_the_model)
    *   [Stop prompting](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#stop_prompting)
    *   [Terminate a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#terminate_a_session)

*   [Multimodal capabilities](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#multimodal_capabilities)
*   [Performance strategy](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#performance_strategy)
*   [Permission Policy, iframes, and Web Workers](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#permission_policy_iframes_and_web_workers)
*   [Participate and share feedback](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#share-feedback)

*   [Home](https://developer.chrome.com/?authuser=4)
*    [Docs](https://developer.chrome.com/docs?authuser=4)
*    [AI on Chrome](https://developer.chrome.com/docs/ai?authuser=4)
*    [Built-in](https://developer.chrome.com/docs/ai/built-in?authuser=4)

Was this helpful?

The Prompt API

bookmark_border bookmark Stay organized with collections  Save and categorize content based on your preferences.
================================================================================================================================

*   On this page
*   [Use the Prompt API](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#use_the_prompt_api)
    *   [Model parameters](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#model_parameters)
    *   [Create a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#create_a_session)
    *   [Add context with initial prompts](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#add_context_with_initial_prompts)
    *   [Session persistence and limits](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#persistence-limits)
    *   [Pass a JSON Schema](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#pass_a_json_schema)
    *   [Clone a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#clone_a_session)
    *   [Prompt the model](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#prompt_the_model)
    *   [Stop prompting](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#stop_prompting)
    *   [Terminate a session](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#terminate_a_session)

*   [Multimodal capabilities](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#multimodal_capabilities)
*   [Performance strategy](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#performance_strategy)
*   [Permission Policy, iframes, and Web Workers](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#permission_policy_iframes_and_web_workers)
*   [Participate and share feedback](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#share-feedback)

![Image 3: Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg?authuser=4)

 Thomas Steiner

[](https://github.com/tomayac)[](https://www.linkedin.com/in/thomassteinerlinkedin)[](https://toot.cafe/@tomayac)[](https://bsky.app/profile/tomayac.com)[](https://blog.tomayac.com/)

![Image 4: Alexandra Klepper](https://web.dev/images/authors/alexandraklepper.jpg?authuser=4)

 Alexandra Klepper

[](https://github.com/alexandrascript)[](https://bsky.app/profile/alexandrascript.com)

Published: May 20, 2025, Last updated: July 21, 2025

| Explainer | Web | Extensions | Chrome Status | Intent |
| --- | --- | --- | --- | --- |
| [GitHub](https://github.com/webmachinelearning/prompt-api) | ![Image 5: Origin trial](https://developer.chrome.com/static/images/experiment.svg?authuser=4) In [Origin trial](https://developer.chrome.com/origintrials/?authuser=4#/view_trial/2533837740349325313) | ![Image 6](https://developer.chrome.com/static/images/chrome_logo.svg?authuser=4) Chrome 138 | [View](https://chromestatus.com/feature/5134603979063296) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/6uBwiiFohAU/m/WhaKAB9fAAAJ?authuser=4) |

With the Prompt API, you can send natural language requests to [Gemini Nano](https://deepmind.google/technologies/gemini/nano/?authuser=4) in the browser.

There are many ways you can use the Prompt API in a web application or website. For example, you could build:

*   **AI-powered search**: Answer questions based on the content of a web page.
*   **Personalized news feeds**: Build a feed that dynamically classifies articles with categories and allow for users to filter for that content.

These are just a few possibilities, and we're excited to see what you create.

**Important**: Gemini Nano is a generative AI model. Before you build with APIs that use Gemini Nano, you should review the [People + AI Guidebook](https://pair.withgoogle.com/guidebook/) for best practices, methods, and examples for designing with AI.

[### Review the hardware requirements](https://developer.chrome.com/docs/ai/prompt-api?authuser=4)
The following requirements exist for developers and the users who operate features using these APIs in Chrome. Other browsers may have different operating requirements.

The Language Detector and Translator APIs work in Chrome on desktop. These APIs do not work on mobile devices. The Prompt API, Summarizer API, Writer API, Rewriter API, and Proofreader API work in Chrome when the following conditions are met:

*   **Operating system**: Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on [Chromebook Plus](https://www.google.com/chromebook/chromebookplus/?authuser=4) devices. Chrome for Android, iOS, and ChromeOS on non-Chromebook Plus devices are not yet supported by the APIs which use Gemini Nano.
*   **Storage**: At least 22 GB of free space on the volume that contains your Chrome profile. Built-in models should be significantly smaller. The exact size may vary slightly with updates.
*   **GPU**: Strictly more than 4 GB of VRAM.
*   **Network**: Unlimited data or an unmetered connection. **Key term**: A [metered connection](https://support.microsoft.com/windows/metered-connections-in-windows-7b33928f-a144-b265-97b6-f2e95a87c408) is a data-limited internet connection. Wi-Fi and ethernet connections tend to be unmetered by default, while cellular connections are often metered.

Gemini Nano's exact size may vary as the browser updates the model. To determine the current size, visit `chrome://on-device-internals`.

**Note**: If the available storage space falls to less than 10 GB after the download, the model is removed from your device. The model redownloads once the requirements are met.

**Note:** Before you use this API, acknowledge [Google's Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy?authuser=4).
Use the Prompt API
------------------

The Prompt API uses the Gemini Nano model in Chrome. While the API is built into Chrome, the model is downloaded separately the first time an origin uses the API.

To determine if the model is ready to use, call [`LanguageModel.availability()`](https://developer.chrome.com/docs/ai/get-started?authuser=4#model_download). If the response to `availability()` was `downloadable`, listen for download progress and inform the user, as the download may take time.

\`\`\`
const availability = await LanguageModel.availability();
\`\`\`
**Caution:** Always pass the same options to the `availability()` function that you use in `prompt()` or `promptStreaming()`. This is critical to align model language and modality capabilities.
To trigger the download and instantiate the language model, check for [user activation](https://developer.chrome.com/docs/ai/get-started?authuser=4#user-activation). Then, call the asynchronous `LanguageModel.create()` function.

\`\`\`
const session = await LanguageModel.create({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  },
});
\`\`\`

### Model parameters

The `params()` function informs you of the language model's parameters. The object has the following fields:

*   `defaultTopK`: The default [top-K](https://ai.google.dev/gemini-api/docs/models/generative-models?authuser=4) value.
*   `maxTopK`: The [maximum top-K](https://ai.google.dev/gemini-api/docs/models/generative-models?authuser=4) value.
*   `defaultTemperature`: The default [temperature](https://ai.google.dev/gemini-api/docs/models/generative-models?authuser=4).
*   `maxTemperature`: The maximum temperature.

\`\`\`
await LanguageModel.params();
// {defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2}
\`\`\`

### Create a session

Once the Prompt API can run, you create a session with the `create()` function.

Each session can be customized with `topK` and `temperature` using an optional options object. The default values for these parameters are returned from `LanguageModel.params()`.

\`\`\`
const params = await LanguageModel.params();
// Initializing a new session must either specify both `topK` and
// `temperature` or neither of them.
const slightlyHighTemperatureSession = await LanguageModel.create({
  temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
  topK: params.defaultTopK,
});
\`\`\`

The `create()` function's optional options object also takes a `signal` field, which lets you pass an `AbortSignal` to destroy the session.

\`\`\`
const controller = new AbortController();
stopButton.onclick = () => controller.abort();

const session = await LanguageModel.create({
  signal: controller.signal,
});
\`\`\`

### Add context with initial prompts

With initial prompts, you can provide the language model with context about previous interactions, for example, to allow the user to resume a stored session after a browser restart.

\`\`\`
const session = await LanguageModel.create({
  initialPrompts: [
    { role: 'system', content: 'You are a helpful and friendly assistant.' },
    { role: 'user', content: 'What is the capital of Italy?' },
    { role: 'assistant', content: 'The capital of Italy is Rome.' },
    { role: 'user', content: 'What language is spoken there?' },
    {
      role: 'assistant',
      content: 'The official language of Italy is Italian. [...]',
    },
  ],
});
\`\`\`

#### Constrain responses with a prefix

You can add an `"assistant"` role, in addition to previous roles, to elaborate on the model's previous responses. For example:

\`\`\`
const followup = await session.prompt([
  {
    role: "user",
    content: "I'm nervous about my presentation tomorrow"
  },
  {
    role: "assistant",
    content: "Presentations are tough!"
  }
]);
\`\`\`

In some cases, instead of requesting a new response, you may want to prefill part of the `"assistant"`-role response message. This can be helpful to guide the language model to use a specific response format. To do this, add `prefix: true` to the trailing `"assistant"`-role message. For example:

\`\`\`
const characterSheet = await session.prompt([
  {
    role: 'user',
    content: 'Create a TOML character sheet for a gnome barbarian',
  },
  {
    role: 'assistant',
    content: '\`\`\`toml\n',
    prefix: true,
  },
]);
\`\`\`

#### Append messages

Inference may take some time, especially when prompting with multimodal inputs. It can be useful to send predetermined prompts in advance to populate the session, so the model can get a head start on processing.

While `initialPrompts` are useful at session creation, the `append()` method can be used in addition to the `prompt()` or `promptStreaming()` methods, to give additional additional contextual prompts after the session is created.

For example:

\`\`\`
const session = await LanguageModel.create({
  initialPrompts: [
    {
      role: 'system',
      content:
        'You are a skilled analyst who correlates patterns across multiple images.',
    },
  ],
  expectedInputs: [{ type: 'image' }],
});

fileUpload.onchange = async () => {
  await session.append([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          value: `Here's one image. Notes: ${fileNotesInput.value}`,
        },
        { type: 'image', value: fileUpload.files[0] },
      ],
    },
  ]);
};

analyzeButton.onclick = async (e) => {
  analysisResult.textContent = await session.prompt(userQuestionInput.value);
};
\`\`\`

The promise returned by `append()` fulfills once the prompt has been validated, processed, and appended to the session. The promise is rejected if the prompt cannot be appended.

### Session persistence and limits

Each session keeps track of the context of the conversation. Previous interactions are taken into account for future interactions until the session's context window is full.

\`\`\`
const session = await LanguageModel.create({
  initialPrompts: [
    {
      role: 'system',
      content:
        'You are a friendly, helpful assistant specialized in clothing choices.',
    },
  ],
});

const result1 = await session.prompt(
  'What should I wear today? It is sunny. I am unsure between a t-shirt and a polo.',
);
console.log(result1);

const result2 = await session.prompt(
  'That sounds great, but oh no, it is actually going to rain! New advice?',
);
console.log(result2);
\`\`\`

Each session has a maximum number of tokens it can process. Check your progress towards this limit with the following:

\`\`\`
console.log(`${session.inputUsage}/${session.inputQuota}`);
\`\`\`

### Pass a JSON Schema

Add the `responseConstraint` field to `prompt()` or `promptStreaming()` method to pass a JSON Schema as the value. You can then use [structured output](https://developer.chrome.com/docs/ai/structured-output-for-prompt-api?authuser=4) with the Prompt API.

In the following example, the JSON Schema makes sure the model responds with `true` or `false` to classify if a given message is about pottery.

\`\`\`
const session = await LanguageModel.create();

const schema = {
  "type": "boolean"
};

const post = "Mugs and ramen bowls, both a bit smaller than intended, but that
happens with reclaim. Glaze crawled the first time around, but pretty happy
with it after refiring.";

const result = await session.prompt(
  `Is this post about pottery?\n\n${post}`,
  {
    responseConstraint: schema,
  }
);
console.log(JSON.parse(result));
// true
\`\`\`

Your implementation can include a JSON Schema or regular expression as part of the message sent to the model. This uses some of the [input quota](https://developer.chrome.com/docs/ai/prompt-api?authuser=4#persistence-limits). You can measure how much of the input quota it will use by passing the `responseConstraint` option to `session.measureInputUsage()`.

You can avoid this behavior with the `omitResponseConstraintInput` option. If you do so, we recommend that you include some guidance in the prompt:

\`\`\`
const result = await session.prompt(`
  Summarize this feedback into a rating between 0-5. Only output a JSON
  object { rating }, with a single property whose value is a number:
  The food was delicious, service was excellent, will recommend.
`, { responseConstraint: schema, omitResponseConstraintInput: true });
\`\`\`

### Clone a session

To preserve resources, you can clone an existing session with the `clone()` function. The conversation context is reset, but the initial prompt remains intact. The `clone()` function takes an optional options object with a `signal` field, which lets you pass an `AbortSignal` to destroy the cloned session.

\`\`\`
const controller = new AbortController();
stopButton.onclick = () => controller.abort();

const clonedSession = await session.clone({
  signal: controller.signal,
});
\`\`\`

### Prompt the model

You can prompt the model with either the `prompt()` or the `promptStreaming()` functions.

#### Non-streamed output

If you expect a short result, you can use the `prompt()` function that returns the response once it's available.

\`\`\`
// Start by checking if it's possible to create a session based on the
// availability of the model, and the characteristics of the device.
const { defaultTemperature, maxTemperature, defaultTopK, maxTopK } =
  await LanguageModel.params();

const available = await LanguageModel.availability();

if (available !== 'unavailable') {
  const session = await LanguageModel.create();

  // Prompt the model and wait for the whole result to come back.
  const result = await session.prompt('Write me a poem!');
  console.log(result);
}
\`\`\`

#### Streamed output

If you expect a longer response, you should use the `promptStreaming()` function which lets you show partial results as they come in from the model. The `promptStreaming()` function returns a `ReadableStream`.

\`\`\`
const { defaultTemperature, maxTemperature, defaultTopK, maxTopK } =
  await LanguageModel.params();

const available = await LanguageModel.availability();
if (available !== 'unavailable') {
  const session = await LanguageModel.create();

  // Prompt the model and stream the result:
  const stream = session.promptStreaming('Write me an extra-long poem!');
  for await (const chunk of stream) {
    console.log(chunk);
  }
}
\`\`\`

### Stop prompting

Both `prompt()` and `promptStreaming()` accept an optional second parameter with a `signal` field, which lets you stop running prompts.

\`\`\`
const controller = new AbortController();
stopButton.onclick = () => controller.abort();

const result = await session.prompt('Write me a poem!', {
  signal: controller.signal,
});
\`\`\`

### Terminate a session

Call `destroy()` to free resources if you no longer need a session. When a session is destroyed, it can no longer be used, and any ongoing execution is aborted. You may want to keep the session around if you intend to prompt the model often since creating a session can take some time.

\`\`\`
await session.prompt(
  "You are a friendly, helpful assistant specialized in clothing choices."
);

session.destroy();

// The promise is rejected with an error explaining that
// the session is destroyed.
await session.prompt(
  "What should I wear today? It is sunny, and I am choosing between a t-shirt
  and a polo."
);
\`\`\`

Multimodal capabilities
-----------------------

The Prompt API origin trial supports audio and image inputs. The API returns a text output.

With these capabilities, you could:

*   Allow users to transcribe audio messages sent in a chat application.
*   Describe an image uploaded to your website for use in a caption or alt text.

\`\`\`
const session = await LanguageModel.create({
  // { type: 'text' } only required when including expected input languages.
  expectedInputs: [{ type: 'audio' }, { type: 'image' }],
});

const referenceImage = await (await fetch('/reference-image.jpeg')).blob();
const userDrawnImage = document.querySelector('canvas');

const response1 = await session.prompt([
  {
    role: 'user',
    content: [
      {
        type: 'text',
        value:
          'Give an artistic critique of how well the second image matches the first:',
      },
      { type: 'image', value: referenceImage },
      { type: 'image', value: userDrawnImage },
    ],
  },
]);

console.log(response1);

const audioBlob = await captureMicrophoneInput({ seconds: 10 });

const response2 = await session.prompt([
  {
    role: 'user',
    content: [
      { type: 'text', value: 'My response to your critique:' },
      { type: 'audio', value: audioBlob },
    ],
  },
]);
\`\`\`

See the [Mediarecorder Audio Prompt](https://chrome.dev/web-ai-demos/mediarecorder-audio-prompt) demo for using the Prompt API with audio input and the [Canvas Image Prompt](https://chrome.dev/web-ai-demos/canvas-image-prompt/) demo for using the Prompt API with image input.

Performance strategy
--------------------

The Prompt API for the web is still being developed. While we build this API, refer to our best practices on [session management](https://developer.chrome.com/docs/ai/session-management?authuser=4) for optimal performance.

Permission Policy, iframes, and Web Workers
-------------------------------------------

By default, the Prompt API is only available to top-level windows and to their same-origin iframes. Access to the API can be delegated to cross-origin iframes using the Permission Policy `allow=""` attribute:

\`\`\`
<!--
  The hosting site at https://main.example.com can grant a cross-origin iframe
  at https://cross-origin.example.com/ access to the Prompt API by
  setting the `allow="language-model"` attribute.
-->
<iframe src="https://cross-origin.example.com/" allow="language-model"></iframe>
\`\`\`

The Prompt API isn't available in Web Workers for now, due to the complexity of establishing a responsible document for each worker in order to check the permissions policy status.

Participate and share feedback
------------------------------

Your input can directly impact how we build and implement future versions of this API and all [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis?authuser=4).

*   For feedback on Chrome's implementation, file a [bug report](https://issues.chromium.org/issues/new?component=1583624&priority=P2&type=bug&template=2168238&noWizard=true) or a [feature request](https://issues.chromium.org/issues/new?component=1617227&priority=P2&type=feature_request&template=0&noWizard=true).
*   Share your feedback on the API shape by commenting on an existing Issue or by opening a new one in the [Prompt API GitHub repository](https://github.com/webmachinelearning/prompt-api).
*   [Join the early preview program](https://developer.chrome.com/docs/ai/join-epp?authuser=4).

Was this helpful?

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies?authuser=4). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-07-21 UTC.

 [[["Easy to understand","easyToUnderstand","thumb-up"],["Solved my problem","solvedMyProblem","thumb-up"],["Other","otherUp","thumb-up"]],[["Missing the information I need","missingTheInformationINeed","thumb-down"],["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"],["Out of date","outOfDate","thumb-down"],["Samples / code issue","samplesCodeIssue","thumb-down"],["Other","otherDown","thumb-down"]],["Last updated 2025-07-21 UTC."],[],[],null,[]]

*   ### Contribute

    *   [File a bug](https://issuetracker.google.com/issues/new?component=1400036&template=1897236)
    *   [See open issues](https://issuetracker.google.com/issues?q=status:open%20componentid:1400036&s=created_time:desc)

*   ### Related content

    *   [Chromium updates](https://blog.chromium.org/)
    *   [Case studies](https://developer.chrome.com/case-studies)
    *   [Archive](https://developer.chrome.com/deprecated)
    *   [Podcasts & shows](https://web.dev/shows)
