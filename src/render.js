const { desktopCapturer, remote } = require('electron')

const currentWindow = remote.getCurrentWindow()
let cursor = { isDown: false, from: { x: null, y: null } }

const videoElement = document.querySelector('video')
videoElement.onloadedmetadata = () => videoElement.play()
videoElement.onmousedown = videoDragStart
videoElement.onmousemove = videoDragging
videoElement.onmouseup = videoDragEnd

const monitorElement = document.getElementById('monitor')
monitorElement.ondragover = e => e.preventDefault()

let currentSource = { name: null }

const sourceBtn = document.querySelector('#sourceBtn>div')
sourceBtn.onclick = getSources

const sourceBtnDrop = document.querySelector('#sourceBtn>ul')

let offsetTop = -window.screenTop
let offsetLeft = -window.screenLeft
let cropTop = 0
let cropLeft = 0

function videoDragStart(e) {
  cursor.isDown = true
  cursor.from.x = e.screenX
  cursor.from.y = e.screenY
}

function videoDragEnd(e) {
  cursor.isDown = false
  if (e.ctrlKey) {
    offsetLeft -= e.screenX - cursor.from.x
    offsetTop -= e.screenY - cursor.from.y
    updateCrop()
  }
}

function videoDragging(e) {
  if (e.ctrlKey && cursor.isDown) {
    const moveX = e.screenX - cursor.from.x
    const moveY = e.screenY - cursor.from.y
    videoElement.style.left = `${-cropLeft + moveX}px`
    videoElement.style.top = `${-cropTop + moveY}px`
  }
}

function updateCrop(direction) {

  switch (direction) {
    case 'left': offsetLeft++; break
    case 'up': offsetTop++; break
    case 'right': offsetLeft--; break
    case 'down': offsetTop--; break
  }

  cropLeft = offsetLeft + window.screenLeft
  cropTop = offsetTop + window.screenTop

  //console.log({ videoElement })
  //videoElement.videoWidth
  //videoElement.videoHeight

  videoElement.style.left = `${-cropLeft}px`
  videoElement.style.top = `${-cropTop}px`
}

window.onresize = updateCrop()

window.onkeydown = e => {
  if (e.ctrlKey) {
    switch (e.keyCode) {
      case 37: updateCrop('left'); break //left
      case 38: updateCrop('up'); break //up
      case 39: updateCrop('right'); break //right
      case 40: updateCrop('down'); break //down
      case 32: updateCrop(); break //space
    }
    videoElement.classList.add('canDrag')
  }
}

window.onkeyup = e => {
  if (e.keyCode === 17) { //ctrl
    videoElement.classList.remove('canDrag')
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
}

// Change the source window to record
async function selectSource(src) {

  offsetTop = -window.screenTop
  offsetLeft = -window.screenLeft
  updateCrop()

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

  sourceBtnDrop.classList.remove('active')
}


/* ------------------------ UI ------------------------ */

function addListener(selector, event, func) {
  const nodes = document.querySelectorAll(selector)

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].addEventListener(event, e => func(e, nodes[i]), true)
  }
}

addListener('#closeBtn', 'click', () => currentWindow.close())

addListener('.drop', 'click', (e, drop) => {
  if (drop.classList.contains('active')) {
    drop.classList.remove('active')
  } else {
    drop.classList.add('active')
  }
})
