document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent default form submission
  
    const form = e.target;
    const formData = new FormData(form);
  
    const xhr = new XMLHttpRequest();
  
    // Show the progress container
    const progressContainer = document.getElementById('progressContainer');
    const progressText = document.getElementById('progressText');
    progressContainer.classList.remove('hidden');
  
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        progressText.textContent = `${percentage}%`;
      }
    };
  
    xhr.onload = function () {
      if (xhr.status === 200) {
        progressText.textContent = 'Upload Complete!';
        setTimeout(() => {
          progressContainer.classList.add('hidden');
        }, 2000); // Hide progress after 2 seconds
      } else {
        progressText.textContent = 'Upload Failed!';
      }
    };
  
    xhr.onerror = function () {
      progressText.textContent = 'An error occurred during upload.';
    };
  
    xhr.open('POST', '/upload', true);
    xhr.send(formData);
  });
  