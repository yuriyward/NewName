================================================
FILE: examples/browser-umd/example.js
================================================
const fileinput = document.getElementById('fileinput')
const output = document.getElementById('output')

const onChangeFile = (mediainfo) => {
  const file = fileinput.files[0]
  if (file) {
    output.value = 'Working…'

    const readChunk = async (chunkSize, offset) =>
      new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer())

    mediainfo
      .analyzeData(file.size, readChunk)
      .then((result) => {
        output.value = result
      })
      .catch((error) => {
        output.value = `An error occured:\n${error.stack}`
      })
  }
}

MediaInfo.mediaInfoFactory({ format: 'text' }, (mediainfo) => {
  fileinput.removeAttribute('disabled')
  fileinput.addEventListener('change', () => onChangeFile(mediainfo))
})



================================================
FILE: examples/browser-umd/index.html
================================================
<!doctype html>
<html lang="en-us">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>mediainfo.js simple demo</title>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
      }
      body * {
        box-sizing: border-box;
      }
      #wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 8px;
        position: absolute;
        width: 100%;
      }
      #fileinput {
        padding-bottom: 8px;
      }
      #output {
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="wrapper">
      <input disabled type="file" id="fileinput" name="fileinput" />
      <textarea id="output"></textarea>
    </div>
    <script type="text/javascript" src="https://unpkg.com/mediainfo.js"></script>
    <script type="text/javascript" src="./example.js"></script>
  </body>
</html>
