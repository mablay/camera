'use strict'
const videoElement = document.querySelector('#video')

// List media devices in the console
navigator.mediaDevices.enumerateDevices()
  .then(devices => devices.forEach(device => {
    const icon = {
      audioinput: '🎤',
      videoinput: '📷',
      audiooutput: '🔊'
    }[device.kind] || device.kind
    console.log(icon, '|', device.label)
  }))

// One object as application state
// statically linking it to its related entities.
// Don't do this in a real application!
const state = {
  constraints: {
    video: false,
    audio: false,
    deviceId: {
      get exact () {
        return state.selectedCamera?.deviceId || null
      }
    }
  },
  get stream () { return videoElement.srcObject },
  set stream (s) { videoElement.srcObject = s },
  cameras: null, // list of available cameras
  selectedCamera: null // camera selected for display
}

// expose the application state to the browser console
window.app = state

async function initState () {
  const devices = await navigator.mediaDevices.enumerateDevices()
  state.cameras = devices.filter(device => device.kind === 'videoinput')
  if (!state.cameras.length) console.warn('No cameras detected!')
  state.selectedCamera = state.cameras[0] || null
  console.log('Selected camera:', state.selectedCamera.label)
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
  const curIdx = state.cameras.findIndex(camera => camera.id === state.selectedCamera.id)
  const nextIdx = (curIdx + 1) % state.cameras.length
  if (nextIdx === curIdx) return
  selectCamera(state.cameras[nextIdx])
}

// select the camera that would be displayed
// if state.constraint.video were true
async function selectCamera (camera) {
  if (state.selectedCamera.id === camera.id) return
  console.log('selecting camera', camera.label)
  state.selectedCamera = camera
  init()
}

async function init () {
  if (!state.cameras) await initState()
  if (!state.constraints.video && !state.constraints.audio) return
  return navigator.mediaDevices.getUserMedia(state.constraints)
    .then(handleSuccess)
    .catch(handleError)
}

function handleSuccess (stream) {
  state.stream = stream
  state.videoTracks = stream.getVideoTracks()
  console.log('Got stream with constraints:', state.constraints)
  console.log(`Using video device: ${state.videoTracks[0].label}`)
  videoElement.srcObject = stream
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

document.querySelector('#toggleVideo')
  .addEventListener('click', toggleVideo)

document.querySelector('#cycleVideoTrack')
  .addEventListener('click', cycleVideoTrack)

initState()
