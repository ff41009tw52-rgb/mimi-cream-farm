# Bird audio upload backend

The six-second iPhone M4A failed with `INVALID_IMAGE_TYPE` because the deployed Apps Script `doPost` routes every `upload` request to `uploadImage_`, which accepts only `image/*`.

The real Apps Script project is `1h6vxvHfAuqwgTfDGk6caIU3mF_23g5N5yC7HMJmNNwymBL9JO0tN41jh` (“民安羽跡圖片服務”). Its current source was exported and a complete replacement for its existing `程式碼` file has been prepared separately for the project owner. Do not commit the full service source to this public repository.

The replacement routes `kind: 'birdAudio'` to `uploadAudio_` after the existing Firebase admin check. It accepts only .m4a/`audio/mp4` and .mp3/`audio/mpeg`, checks base64, byte length (maximum 5 MiB), and file headers, and stores the file in the existing bird Drive folder with the existing anonymous-view permission. The success job contains `fileId`, `fileName`, `mimeType`, and `size`. Other uploads retain the photo-only validation, and the existing delete route works because the audio is in the bird folder. The `doGet` version is updated to `3.1.0` as a deployment check.

Local VM checks pass for valid M4A/MP3, invalid file contents/extensions, over-limit files, and the preserved photo-only validation. These are isolated checks, not a live mobile playback test.

## Release sequence

1. The project owner saved the prepared complete source in the original Apps Script project and reported deploying a new version of the existing web app.
2. A fresh project export confirms the saved source reports version `3.1.0` and includes `uploadAudio_`. This environment could not open the `/exec` endpoint to verify which web app version serves traffic.
3. The frontend PR has been merged. The public site now references `bird-stable.js?v=20260926-audio3`, and the repository's current JavaScript sends `kind: 'birdAudio'`.
4. Still verify a real M4A from iPhone Safari, anonymous playback, optional audio creation, later replacement, and one photo upload. A live upload requires an administrator login.
