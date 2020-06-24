const { desktopCapturer, remote } = require('electron')
const { writeFile } = require('fs')
const { dialog } = remote

// Global state
const currentWindow = remote.getCurrentWindow()
const videoElement = document.querySelector('video')

const closeBtn = document.querySelector('#closeBtn')
const sourceBtn = document.querySelector('#sourceBtn>div')
const sourceBtnDrop = document.querySelector('#sourceBtn>ul')
const dragBtn = document.querySelector('#dragBtn')

closeBtn.onclick = () => currentWindow.close()
sourceBtn.onclick = getSources
currentWindow.onclick = () => console.log('blau')

let offsetTop = window.screenTop
let offsetLeft = window.screenLeft

function updateCoordinates() {

  videoElement.style.marginTop
    = `${offsetTop - window.screenTop}px`
    videoElement.style.marginLeft
    = `${offsetLeft - window.screenLeft}px`
}

window.onresize = updateCoordinates()

window.onkeydown = e => {
  if (e.ctrlKey) {
    switch (e.keyCode) {
      case 37: //left
        offsetLeft--
        break
      case 38: //up
        offsetTop--
        break
      case 39: //right
        offsetLeft++
        break
      case 40: //down
        offsetTop++
        break
      default: //nothing
    }
    updateCoordinates()
  }
}

// Get the avaliable video sources
async function getSources() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  })

  sourceBtnDrop.innerHTML = ''
  sources.forEach(src => {
    if (src.name !== 'foobar') {
      const el = document.createElement('ul')
      el.innerHTML = `<div class="btn">${src.name}</div>`
      el.onclick = () => selectSource(src)
      sourceBtnDrop.appendChild(el)
    }
  })

  if (sourceBtnDrop.classList.contains('active')) {
    sourceBtnDrop.classList.remove('active')
  } else {
    sourceBtnDrop.classList.add('active')
  }
}

// Change the source window to record
async function selectSource(src) {

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

  sourceBtnDrop.classList.remove('active')
}

// Thanks Fireship ^_^ (youtu.be/3yqDxhR2XxE)