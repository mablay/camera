'use strict'
const videoElement = document.querySelector('#video')
infoMsg('v0.1.1')
// List media devices in the console
navigator.mediaDevices.enumerateDevices()
  .then(devices => devices.forEach(device => {
    const icon = {
      audioinput: '🎤',
      videoinput: '📷',
      audiooutput: '🔊'
    }[device.kind] || device.kind
    infoMsg(`${icon} | ${device.label}`)
  }))

// One object as application state
// statically linking it to its related entities.
// Don't do this in a real application!
const state = {
  constraints: { video: false, audio: false },
  get stream () { return videoElement.srcObject },
  set stream (s) { videoElement.srcObject = s },
  cameras: null, // list of available cameras
  selectedCamera: 0, // camera selected for display
  get camera () {
    if (!state.cameras) return {}
    return state.cameras[state.selectedCamera]
  }
}

function getConstraints () {
  if (state.constraints.video) {
    return {
      audio: false,
      video: {
        deviceId: {
          exact: state.camera.deviceId
        }
      }
    }
  }
  return { audio: false, video: false }
}

// expose the application state to the browser console
window.app = state

async function initState () {
  const devices = await navigator.mediaDevices.enumerateDevices()
  state.cameras = devices.filter(device => device.kind === 'videoinput')
  if (!state.cameras.length) console.warn('No cameras detected!')
  console.log('Selected camera:', state.camera.label)
  state.cameras.forEach((c, i) => infoMsg(`${i + 1}: ${c.label}`))
}

async function toggleVideo () {
  state.constraints.video = !state.constraints.video
  if (!state.constraints.video) {
    if (!state.stream) return
    state.stream.getVideoTracks().forEach(track => track.stop())
    state.stream = null // state.stream will proxy the assignemnt
  } else {
    init()
  }
}

function cycleVideoTrack () {
  const index = state.selectedCamera
  const nextIdx = (index + 1) % state.cameras.length
  // infoMsg(`curIdx: ${index} | nextIdx: ${nextIdx}`)
  // if (nextIdx === index) return
  state.selectedCamera = nextIdx
  infoMsg(`selected: ${state.camera.label} | ${state.camera.deviceId}`)
  // init()
  if (!state.stream) return
  state.stream.getVideoTracks()[0].applyConstraints(getConstraints())
}

// select the camera that would be displayed
// if state.constraint.video were true
// async function selectCamera (camera) {
//   if (state.selectedCamera.id === camera.id) return
//   console.log('selecting camera', camera.label)
//   state.selectedCamera = camera
//   init()
// }

async function init () {
  if (!state.cameras) await initState()
  if (!state.constraints.video && !state.constraints.audio) return
  if (state.stream) {
    state.stream.getVideoTracks().forEach(track => track.stop())
    state.stream = null // state.stream will proxy the assignemnt
  }
  const constraints = getConstraints()
  infoMsg(constraints.video.deviceId.exact)
  console.log('requesting user media', constraints)
  return navigator.mediaDevices.getUserMedia(constraints)
    .then(handleSuccess)
    .catch(handleError)
}

function handleSuccess (stream) {
  state.stream = stream
  console.log('Got stream with constraints:', state.constraints)
  console.log(`Using video device: ${state.stream.getVideoTracks()[0].label}`)
}

function handleError (error) {
  if (error.name === 'ConstraintNotSatisfiedError') {
    const v = state.constraints.video
    errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`)
  } else if (error.name === 'PermissionDeniedError') {
    errorMsg('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.')
  }
  errorMsg(`${error.name}: ${error.message}`, error)
}

function errorMsg (msg, error) {
  const errorElement = document.querySelector('#errorMsg')
  errorElement.innerHTML += `<p>${msg}</p>`
  if (typeof error !== 'undefined') {
    console.error(error)
  }
}

function infoMsg (msg) {
  document.querySelector('#infoMsg')
    .innerHTML += `<div>${msg}</div>`
}

document.querySelector('#toggleVideo')
  .addEventListener('click', toggleVideo)

document.querySelector('#cycleVideoTrack')
  .addEventListener('click', cycleVideoTrack)

initState()
