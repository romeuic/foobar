const { desktopCapturer, remote } = require('electron')

// sets globals
const currentWindow = remote.getCurrentWindow()
let cursor = { isDown: false, from: { x: null, y: null } }
let currentSource = { name: null }
let barIndex = 0
let track = { gaps: [] }
const gap = i => track.gaps[i + barIndex]

const updateBarIndex = (direction) => {
  switch (direction) {
    case 'left':
      if (track.gaps.length > barIndex + 8) {
        barIndex += 2
      }
      break
    case 'right':
      if (barIndex - 2 >= 0) {
        barIndex -= 2
      }
      break
  }
}

let d = []
let height = 0
let width = 0

const getPixel = (x, y) => {
  const i = y * width * 4 + x * 4
  const [ir, ig, ib, ia] = [i, i + 1, i + 2, i + 3]
  return {
    i,
    rgba: (r = null, g = null, b = null, a = null) => {
      if (r !== null) data[ir] = r
      if (g !== null) data[ig] = g
      if (b !== null) data[ib] = b
      if (a !== null) data[ia] = a
    },
    r: data[ir],
    g: data[ig],
    b: data[ib],
    a: data[ia],
  }
}

// sets video and initial attributes
const video = document.querySelector('video')
video.onloadedmetadata = () => video.play()
video.onmousedown = videoDragStart
video.onmousemove = videoDragging
video.onmouseup = videoDragEnd

// sets canvas and gets context
const canvasSrc = document.querySelector('canvas')
const canvasSrc2d = canvasSrc.getContext('2d')
let sourceData = null

// sets feedback image
const img = document.querySelector('img')

// blocks monitor ondrag event
const monitor = document.getElementById('monitor')
monitor.ondragover = e => e.preventDefault()

// sets source drop button and list
const sourceDropBtn = document.querySelector('#sourceDrop>.btn')
sourceDropBtn.onmouseenter = getSources
const sourceDropList = document.querySelector('#sourceDrop>ul')

// building tracker structure
const barsTracker = document.getElementById('barsTracker')
const div = () => document.createElement('div')
const divs = (cols, rows) => {
  const d = div()
  for (let i = 0; i < cols; i++) {
    const c = div()
    for (let j = 0; j < rows; j++) {
      c.appendChild(div())
    }
    d.appendChild(c)
  }
  return d
}
barsTracker.appendChild(divs(3, 12))
barsTracker.appendChild(divs(3, 12))
barsTracker.appendChild(divs(3, 12))
barsTracker.appendChild(divs(3, 18))

const barsNodes = document.querySelectorAll('#barsTracker>div')
const buyendLine = document.getElementById('buyendLine')
const finishLine = document.getElementById('finishLine')
const priceIndex = document.getElementById('priceIndex')
let finish = 0
let price = 0

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
  cursor = {
    isDown: true,
    from: {
      x: e.screenX,
      y: e.screenY,
    }
  }
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
  canvasSrc.width = crop.width
  canvasSrc.height = crop.height

  if (crop.left >= 0 && crop.top >= 0
    && crop.left + crop.width <= video.offsetWidth
    && crop.top + crop.height <= video.offsetHeight
  ) {
    canvasSrc2d.drawImage(
      video,
      crop.left, crop.top, crop.width, crop.height,
      0, 0, crop.width, crop.height
    )
    img.setAttribute('src', canvasSrc.toDataURL('image/jpeg'))

    sourceData = canvasSrc2d.getImageData(0, 0, crop.width, crop.height)

    // declarar global
    data = sourceData.data
    height = sourceData.height
    width = sourceData.width

    const rgbaLog = p => console.log({ r: p.r, g: p.g, b: p.b, a: p.a })
    let found

    // finds and updates buyend-line x value
    buyendLine.style.left = `${width}px` //todo: end this track

    // finds and updates finish-line x value
    found = false
    for (let x = width; x > 0 ; x--) {
      const p = getPixel(x, 0) //-first-row
      if (p.r > 80 && p.b < 80) {
        finish = x
        found = true
        break
      }
    }
    for (let y = 0; y < height; y++) {
      for (let i = -1; i < 5; i++) {
        const p = getPixel(finish - i, y)
        p.rgba(null, null, null, 0)
      }
    }
    finishLine.style.left = `${found ? finish - 1 : width}px`

    // finds and updates price y value
    found = false
    for (let y = 0; y < height; y++) { //-all-lines
      const p = getPixel(width - 1, y) //-last-column
      if (p.r > 60 && p.b < 60) {
        price = y
        found = true
        break
      }
    }
    priceIndex.style.top = `${found && finish < width ? price : height}px`

    // hides background info and tracks bars x positions
    let lastIsVoid = false
    let isVoid
    track = {
      top: null,
      bottom: null,
      bar: { width: 0, height: 0 },
      gaps: [],
    }
    for (let x = width - 1; x >= 0; x--) { //-all-columns
      isVoid = true
      for (let y = 0; y < height; y++) { //-all-lines
        const p = getPixel(x, y)
        if (p.r < 120 && p.g < 120 && p.b < 100) //b113
          p.rgba(null, null, null, 0)
        else if (isVoid)
          isVoid = false
      }

      if (isVoid) {
        if (!lastIsVoid) track.gaps.push(x)
        lastIsVoid = true
      } else if (lastIsVoid) {
        track.gaps.push(x + 1)
        lastIsVoid = false
      }
    }

    // traks bars y positions
    for (let y = 0; y < height; y++) { //-all-lines
      found = false
      for (let x = gap(6); x < gap(1); x++) { //-bars-columns
        const p = getPixel(x, y)
        if (p.a !== 0) {
          found = true
          break
        }
      }
      if (found) if (track.top === null) track.top = y - 1
      else if(track.top !== null) track.bottom = y 
    }
    track.bar.width = ((gap(1) - gap(2)) + (gap(3) - gap(4)) + (gap(5) - gap(6))) / 3
    track.bar.height = track.bottom - track.top + 2

    // updates tracker monitor
    if (track.gaps.length >= barIndex + 6) {
      barsTracker.style.left = `${gap(6)}px`
      barsTracker.style.top = `${track.top}px`
      barsTracker.style.height = `${track.bar.height}px`

      barsNodes[0].style.width = `${gap(5) - gap(6)}px`
      barsNodes[0].style.marginRight = `${gap(4) - gap(5)}px`

      barsNodes[1].style.width = `${gap(3) - gap(4)}px`
      barsNodes[1].style.marginRight = `${gap(2) - gap(3)}px`

      barsNodes[2].style.width = `${gap(1) - gap(2)}px`
      barsNodes[2].style.marginRight = `${gap(0) - gap(1)}px`

      barsNodes[3].style.width = `${track.bar.width}px`
      barsNodes[3].style.marginTop = `-${track.bar.height / 4}px`
      barsNodes[3].style.height = `${track.bar.height * 1.5}px`
    }

    // to be continued

    //for (let y = 0; y < height; y++) { //lines
    //  for (let x = 0; x < width; x++) { //columns
    //    const p = getPixel(x, y)
    //    if (x > width -10 && p.r > 100) {
    //      //setPriceIndex(y)
    //    }
    //  }
    //}

    canvasSrc2d.putImageData(sourceData, 0, 0)

  } else {
    console.error('nope')
  }
}

// sets keyboard interaction
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
    canvasSrc.style.opacity = 0
  } else {
    switch (e.keyCode) {
      case 37: updateBarIndex('left'); break //left
      //case 38: updateCrop('up'); break //up
      case 39: updateBarIndex('right'); break //right
      //case 40: updateCrop('down'); break //down
    }
  }
}

window.onkeyup = e => {
  if (e.keyCode === 17) { //ctrl
    video.classList.remove('canDrag')
    canvasSrc.style.opacity = 1
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

  barIndex = 0
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
  }, 333)
}
tick()
