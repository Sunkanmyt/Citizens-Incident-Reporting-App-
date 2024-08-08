document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // console.log('Device is ready');
    fetchIncidents();
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch('https://reportincident.free.nf/wp-json/jwt-auth/v1/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = 'main.html';
        } else {
            document.getElementById('loginError').textContent = 'Invalid login credentials';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loginError').textContent = 'An error occurred. Please try again.';
    });
}

function fetchIncidents() {
    fetch('https://reportincident.free.nf/wp-json/wp/v2/posts', {
    })
    .then(response => response.json())
    .then(data => {
        // console.log("data", data); // Log the response data to inspect the structure
        const incidentContainer = document.getElementById('incident-container');
        incidentContainer.innerHTML = '';
        data.forEach(post => {
            const acf = post.acf || {};
            const latitude = acf.latitude || 'Not provided';
            const longitude = acf.longitude || 'Not provided';
            const category = acf.category || 'Not provided';

            // Handle the picture field which returns an attachment ID
            let picture = 'No picture available';
            if (acf.picture && typeof acf.picture === 'number') {
                const pictureId = acf.picture;
                // Fetch the image URL using the media ID
                fetch(`https://reportincident.free.nf/wp-json/wp/v2/media/${pictureId}`)
                    .then(response => response.json())
                    .then(mediaData => {
                        const imageUrl = mediaData.source_url;
                        document.querySelector(`.incident-picture-${post.id}`).innerHTML = `<img src="${imageUrl}" alt="Incident Picture" width="100%">`;
                    })
                    .catch(error => {
                        console.error('Error fetching image:', error);
                    });
                picture = `<div class="incident-picture-${post.id}">Loading picture...</div>`;
            }

            const postElement = document.createElement('div');
            postElement.className = 'incident';
            postElement.innerHTML = `
                <div class="incident-title">${post.title.rendered}</div>
                <div class="incident-description">${post.content.rendered}</div>
                <div class="incident-category">Category: ${category}</div>
                <div class="incident-location">Location: (${latitude}, ${longitude})</div>
                <div class="incident-picture">${picture}</div>
            `;
            incidentContainer.appendChild(postElement);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to fetch posts: ' + error.message);
    });
}

// Check if token exists when loading the main page
if (window.location.pathname.endsWith('index.html')) {
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
    } else {
        fetchIncidents();
    }
}


function submitIncident() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const picture = document.getElementById('picture').files[0];

    navigator.geolocation.getCurrentPosition(function(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Function to upload image
        function uploadImage(file) {
            const formData = new FormData();
            formData.append('file', file);
            return fetch('https://reportincident.free.nf/wp-json/wp/v2/media', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    'Content-Disposition': `attachment; filename="${file.name}"`
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
        }

        // Function to create post
        function createPost(imageId = null) {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', description);
            formData.append('acf[latitude]', latitude);
            formData.append('acf[longitude]', longitude);
            formData.append('acf[category]', category);
            formData.append('status', 'publish'); // Sets the post status to 'publish'
            if (imageId) {
                formData.append('acf[picture]', imageId);
            }

            return fetch('https://reportincident.free.nf/wp-json/wp/v2/posts', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });

        }

        if (picture) {
            uploadImage(picture)
            .then(data => {
                const imageId = data.id;
                return createPost(imageId);
            })
            .then(postData => {
                // console.log('Success:', postData);
                alert('Incident submitted successfully!');
                fetchIncidents();
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('incidentError').textContent = 'Failed to submit incident: ' + error.message;
            });
        } else {
            createPost()
            .then(postData => {
                // console.log('Success:', postData);
                alert('Incident submitted successfully!');
                fetchIncidents();
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('incidentError').textContent = 'Failed to submit incident: ' + error.message;
            });
        }
        
    }, function(error) {
        console.error('Error getting geolocation', error);
        alert('Error getting geolocation');
    });
}

