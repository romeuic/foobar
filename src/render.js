const { desktopCapturer, remote } = require('electron')
const { writeFile } = require('fs')
const { dialog, Menu } = remote

// Global state
const videoType = 'video/webm; codecs=vp9'
let mediaRecorder // MediaRecorder instance to capture footage
const recordedChunks = []

// Buttons
const videoElement = document.querySelector('video')

const startBtn = document.getElementById('startBtn')
startBtn.disabled = true
startBtn.onclick = e => {
  mediaRecorder.start()
  startBtn.disabled = true
  stopBtn.disabled = false
}

const stopBtn = document.getElementById('stopBtn')
stopBtn.disabled = true
stopBtn.onclick = e => {
  mediaRecorder.stop()
  stopBtn.disabled = true
  startBtn.disabled = false
}

const sourceBtn = document.getElementById('sourceBtn')
sourceBtn.onclick = getSources

// Get the avaliable video sources
async function getSources() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  })

  const optionsMenu = Menu.buildFromTemplate(
    sources.map(src => ({
      label: src.name,
      click: () => selectSource(src)
    }))
  )

  optionsMenu.popup()
}

// Change the source window to record
async function selectSource(src) {
  sourceBtn.innerText = src.name

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: src.id
      }
    }
  }

  // Create a Stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints)

  // Preview the source in a video element
  videoElement.srcObject = stream
  videoElement.play()

  // Create the Media Recorder
  const options = { mimeType: videoType }
  mediaRecorder = new MediaRecorder(stream, options)

  // Register Event Handlers
  mediaRecorder.ondataavaliable = handleDataAvaliable
  mediaRecorder.onstop = handleStop

  // Enable startBtn
  startBtn.disabled = false
}

// Captures all recorded chunks
function handleDataAvaliable(e) {
  console.log('video data avaliable')
  recordedChunks.push(e.data)
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, { type: videoType })

  const buffer = Buffer.from(await blob.arrayBuffer())

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`
  })

  console.log(filePath)

  writeFile(filePath, buffer, () => console.log('video saved'))
}

// Thanks Fireship ^_^ (youtu.be/3yqDxhR2XxE)