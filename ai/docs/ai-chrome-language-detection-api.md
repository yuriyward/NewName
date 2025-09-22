Language detection with built-in AI | AI on Chrome | Chrome for Developers

===============
Language detection with built-in AI

bookmark_border bookmark Stay organized with collections  Save and categorize content based on your preferences.
=====================================================================================================================================================

*   On this page
*   [When to use language detection](https://developer.chrome.com/docs/ai/language-detection?authuser=4#when_to_use_language_detection)
*   [Get started](https://developer.chrome.com/docs/ai/language-detection?authuser=4#get_started)
    *   [Model download](https://developer.chrome.com/docs/ai/language-detection?authuser=4#model_download)
    *   [Run the language detector](https://developer.chrome.com/docs/ai/language-detection?authuser=4#run_the_language_detector)

*   [API playground](https://developer.chrome.com/docs/ai/language-detection?authuser=4#api_playground)
*   [Permission Policy, iframes, and Web Workers](https://developer.chrome.com/docs/ai/language-detection?authuser=4#permission_policy_iframes_and_web_workers)
*   [Share your feedback](https://developer.chrome.com/docs/ai/language-detection?authuser=4#share_your_feedback)

![Image 3: Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg?authuser=4)

 Thomas Steiner

[](https://github.com/tomayac)[](https://www.linkedin.com/in/thomassteinerlinkedin)[](https://toot.cafe/@tomayac)[](https://bsky.app/profile/tomayac.com)[](https://blog.tomayac.com/)

Published: September 24, 2024, Last updated: May 20, 2025

Browser Support

*   ![Image 4: Chrome: 138.](blob:http://localhost/47c32cc0720c20d5a6e0658ef8d1ac20) 138
*   ![Image 5: Edge: not supported.](blob:http://localhost/e1a69b04fb43f0469061a1871c3032fb) x
*   ![Image 6: Firefox: not supported.](blob:http://localhost/16ee05cf3dcacc1e5501effff1065887) x
*   ![Image 7: Safari: not supported.](blob:http://localhost/17f83e46748dda484a895818a950506a) x

[Source](https://developer.mozilla.org/docs/Web/API/LanguageDetector)

Before translating text from one language to another, you must first determine what language is used in the given text. Previously, translation required uploading the text to a cloud service, performing the translation on the server, then downloading the results.

The Language Detector API works client-side, which means you can protect user privacy. While it's possible to ship a specific library which does this, it would require additional resources to download.

**Note:**[Join the Early Preview Program](https://developer.chrome.com/docs/ai/join-epp?authuser=4) for an early look at new built-in AI APIs and access to discussion on our mailing list.
When to use language detection
------------------------------

The Language Detector API is primarily useful in the following scenarios:

*   Determine the language of input text, so it can be translated.
*   Determine the language of input text, so the correct model can be loaded for language-specific tasks, such as toxicity detection.
*   Determine the language of input text, so it can be labeled correctly, for example, in online social networking sites.
*   Determine the language of input text, so an app's interface can be adjusted accordingly. For example, on a Belgian site to only show the interface relevant to users who speak French.

Get started
-----------

Run feature detection to see if the browser supports the Language Detector API.

\`\`\`
if ('LanguageDetector' in self) {
  // The Language Detector API is available.
}
\`\`\`

### Model download

Language detection depends on a model that is fine-tuned for the specific task of detecting languages. While the API is built in the browser, the model is downloaded on-demand the first time a site tries to use the API. In Chrome, this model is very small by comparison with other models. It might already be present, as this model is used by other Chrome features.

To determine if the model is ready to use, call the asynchronous [`LanguageDetector.availability()`](https://developer.chrome.com/docs/ai/get-started?authuser=4#model-download) function. If the response to `availability()` was `downloadable`, listen for download progress and inform the user, as the download may take time.

To trigger the download and instantiate the language detector, check for [user activation](https://developer.chrome.com/docs/ai/get-started?authuser=4#user-activation). Then, call the asynchronous `LanguageDetector.create()` function.

\`\`\`
const detector = await LanguageDetector.create({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  },
});
\`\`\`

### Run the language detector

The Language Detector API uses a ranking model to determine which language is most likely used in a given piece of text. _Ranking_ is a type of machine learning, where the objective is to order a list of items. In this case, the Language Detector API ranks languages from highest to lowest probability.

**Note:** The Language Detector API is trained on a set of languages, which is not wholly inclusive of every language that exists. This means the API cannot detect every language with complete accuracy. From Chrome 132, you can check if a given language is available for detection.
The `detect()` function can return either the first result, the likeliest answer, or iterate over the ranked candidates with the level of confidence. This is returned as a list of `{detectedLanguage, confidence}` objects. The `confidence` level is expressed as a value between `0.0` (lowest confidence) and `1.0` (highest confidence).

\`\`\`
const someUserText = 'Hallo und herzlich willkommen!';
const results = await detector.detect(someUserText);
for (const result of results) {
  // Show the full list of potential languages with their likelihood, ranked
  // from most likely to least likely. In practice, one would pick the top
  // language(s) that cross a high enough threshold.
  console.log(result.detectedLanguage, result.confidence);
}
// (Output truncated):
// de 0.9993835687637329
// en 0.00038279531872831285
// nl 0.00010798392031574622
// ...
\`\`\`
**Caution:** Very short phrases and single words should be avoided, as the accuracy of the results will be low. If you commonly work with shorter text, experiment with your priority languages, review the reported confidence, and return the result as unknown when the confidence is too low.
API playground
--------------

Experiment with the Language Detector API in our [API playground](https://chrome.dev/web-ai-demos/translation-language-detection-api-playground/). Enter text written in different languages in the textarea.

Permission Policy, iframes, and Web Workers
-------------------------------------------

By default, the Language Detector API is only available to top-level windows and to their same-origin iframes. Access to the API can be delegated to cross-origin iframes using the Permission Policy `allow=""` attribute:

\`\`\`
<!--
  The hosting site at https://main.example.com can grant a cross-origin iframe
  at https://cross-origin.example.com/ access to the Language Detector API by
  setting the `allow="language-detector"` attribute.
-->
<iframe src="https://cross-origin.example.com/" allow="language-detector"></iframe>
\`\`\`

The Language Detector API isn't available in Web Workers. This is due to the complexity of establishing a responsible document for each worker in order to check the Permissions Policy status.

Share your feedback
-------------------

We want to see what you're building with the Language Detector API. Share your websites and web applications with us on [X](https://x.com/ChromiumDev), [YouTube](https://www.youtube.com/user/ChromeDevelopers?authuser=4), and [LinkedIn](https://www.linkedin.com/showcase/chrome-for-developers/).

If you have feedback on Chrome's implementation, file a [Chromium bug](https://new.crbug.com/).

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies?authuser=4). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-05-20 UTC.

 [[["Easy to understand","easyToUnderstand","thumb-up"],["Solved my problem","solvedMyProblem","thumb-up"],["Other","otherUp","thumb-up"]],[["Missing the information I need","missingTheInformationINeed","thumb-down"],["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"],["Out of date","outOfDate","thumb-down"],["Samples / code issue","samplesCodeIssue","thumb-down"],["Other","otherDown","thumb-down"]],["Last updated 2025-05-20 UTC."],[],[],null,[]]

*   ### Contribute

    *   [File a bug](https://issuetracker.google.com/issues/new?component=1400036&template=1897236)
    *   [See open issues](https://issuetracker.google.com/issues?q=status:open%20componentid:1400036&s=created_time:desc)

*   ### Related content

    *   [Chromium updates](https://blog.chromium.org/)
    *   [Case studies](https://developer.chrome.com/case-studies)
    *   [Archive](https://developer.chrome.com/deprecated)
    *   [Podcasts & shows](https://web.dev/shows)
