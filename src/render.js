const { desktopCapturer, remote } = require('electron')
const { writeFile } = require('fs')
const { dialog } = remote

// Global state
const currentWindow = remote.getCurrentWindow()
const videoElement = document.querySelector('video')
let currentSource = {}

const closeBtn = document.querySelector('#closeBtn')
const sourceBtn = document.querySelector('#sourceBtn>div')
const sourceBtnDrop = document.querySelector('#sourceBtn>ul')
const dragBtn = document.querySelector('#dragBtn')

closeBtn.onclick = () => currentWindow.close()
sourceBtn.onclick = getSources

let offsetTop = window.screenTop
let offsetLeft = window.screenLeft

function updateCoordinates() {
  videoElement.style.marginTop = `${offsetTop - window.screenTop}px`
  videoElement.style.marginLeft = `${offsetLeft - window.screenLeft}px`
}

window.onresize = updateCoordinates()

window.onkeydown = e => {
  if (e.ctrlKey) {
    switch (e.keyCode) {
      case 37: offsetLeft--; break //left
      case 38: offsetTop--; break //up
      case 39: offsetLeft++; break //right
      case 40: offsetTop++; break //down
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
      const el = document.createElement('li')
      el.innerHTML = `<div class="btn">${src.name}</div>`
      el.onclick = () => selectSource(src)
      if (currentSource.name === src.name) {
        el.classList.add('selected')
      } 
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
  currentSource = src
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