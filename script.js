const video = document.getElementById('video');
const markAttendanceButton = document.getElementById('markAttendance');
const statusDiv = document.getElementById('status');

// Load face-api models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo);

// Start video from webcam
function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then(stream => (video.srcObject = stream))
    .catch(err => console.error(err));
}

video.addEventListener('play', async () => {
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  video.addEventListener('timeupdate', async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length) {
      const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
      if (bestMatch.label !== 'unknown') {
        statusDiv.textContent = `Hello, ${bestMatch.label}`;
        logAttendance(bestMatch.label);
      }
    }
  });
});

// Load labeled images
function loadLabeledImages() {
  const labels = ['Your Name']; // Add more labels for multiple users
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`/labeled_images/${label}/${i}.jpg`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

// Log attendance to the backend
function logAttendance(name) {
  fetch('/mark-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
    .then(res => res.text())
    .then(message => console.log(message))
    .catch(err => console.error(err));
}
