const { desktopCapturer, remote } = require('electron')

const currentWindow = remote.getCurrentWindow()
let cursor = { isDown: false, from: { x: null, y: null } }

const video = document.querySelector('video')
video.onloadedmetadata = () => video.play()
video.onmousedown = videoDragStart
video.onmousemove = videoDragging
video.onmouseup = videoDragEnd

const canvas = document.querySelector('canvas')
const canvas2d = canvas.getContext('2d')
const img = document.querySelector('img')

const monitor = document.getElementById('monitor')
monitor.ondragover = e => e.preventDefault()

let currentSource = { name: null }

const sourceDropBtn = document.querySelector('#sourceDrop>.btn')
sourceDropBtn.onmouseenter = getSources

const sourceDropList = document.querySelector('#sourceDrop>ul')

let offset = {
  top: -window.screenTop,
  left: -window.screenLeft,
}

let crop = {
  top: 0,
  left: 0,
  width: monitor.offsetWidth,
  height: monitor.offsetHeight,
}

function videoDragStart(e) {
  cursor.isDown = true
  cursor.from.x = e.screenX
  cursor.from.y = e.screenY
}

function videoDragEnd(e) {
  cursor.isDown = false
  if (e.ctrlKey) {
    offset.left -= e.screenX - cursor.from.x
    offset.top -= e.screenY - cursor.from.y
    updateCrop()
  }
}

function videoDragging(e) {
  if (e.ctrlKey && cursor.isDown) {
    const moveX = e.screenX - cursor.from.x
    const moveY = e.screenY - cursor.from.y
    video.style.left = `${-crop.left + moveX}px`
    video.style.top = `${-crop.top + moveY}px`
  }
}

function updateCrop(direction) {

  switch (direction) {
    case 'left': offset.left++; break
    case 'up': offset.top++; break
    case 'right': offset.left--; break
    case 'down': offset.top--; break
  }

  crop = {
    left: offset.left + window.screenLeft,
    top: offset.top + window.screenTop,
    width: monitor.offsetWidth,
    height: monitor.offsetHeight,
  }

  video.style.left = `${-crop.left}px`
  video.style.top = `${-crop.top}px`
  canvas.width = crop.width
  canvas.height = crop.height

  if (crop.left >= 0 && crop.top >= 0
    && crop.left + crop.width <= video.offsetWidth
    && crop.top + crop.height <= video.offsetHeight
  ) {
    canvas2d.drawImage(
      video,
      crop.left, crop.top, crop.width, crop.height,
      0, 0, crop.width, crop.height
    )
    img.setAttribute('src', canvas.toDataURL('image/jpeg'))

    // to be continued
    //console.log(canvas2d.getImageData(0, 0, crop.width, crop.height))

  } else {
    console.error('nope')
  }
}

window.onkeydown = e => {
  if (e.ctrlKey) {
    switch (e.keyCode) {
      case 37: updateCrop('left'); break //left
      case 38: updateCrop('up'); break //up
      case 39: updateCrop('right'); break //right
      case 40: updateCrop('down'); break //down
      //case 32: updateCrop(); break //space
      //case 13: foobar(); break //enter
    }
    video.classList.add('canDrag')
    canvas.style.opacity = 0
  }
}

window.onkeyup = e => {
  if (e.keyCode === 17) { //ctrl
    video.classList.remove('canDrag')
    canvas.style.opacity = 1
  }
}

// Get the avaliable video sources
async function getSources() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  })

  sourceDropList.innerHTML = ''
  sources.forEach(src => {
    if (src.name !== 'foobar') {
      const el = document.createElement('li')
      el.innerHTML = `<div class="btn">${src.name}</div>`

      el.onclick = () => selectSource(src)

      if (currentSource.name === src.name) {
        el.classList.add('selected')
      } 
      sourceDropList.appendChild(el)
    }
  })
}

// Change the source window to record
async function selectSource(src) {

  offset.top = -window.screenTop
  offset.left = -window.screenLeft
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
  video.srcObject = stream

  getSources()
}


/* ------------------------ UI ------------------------ */

function addListener(selector, event, func) {
  const nodes = document.querySelectorAll(selector)

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].addEventListener(event, e => func(e, nodes[i]), true)
  }
}

addListener('#closeBtn', 'click', () => currentWindow.close())

addListener('.drop.static', 'click', (e, drop) => {
  if (drop.classList.contains('active')) {
    drop.classList.remove('active')
  } else {
    drop.classList.add('active')
  }
})

function tick() {
  setTimeout(() => {
    if (!video.classList.contains('canDrag')) {
      updateCrop()
    }
    tick()
  }, 1000)
}
tick()
