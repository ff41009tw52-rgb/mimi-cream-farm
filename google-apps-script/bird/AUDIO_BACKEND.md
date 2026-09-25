# Bird audio upload backend change

The deployed bird site sends uploads to an existing Google Apps Script web app through
`submitDriveJob('upload', payload)`. The current service returns
`INVALID_IMAGE_TYPE` for a six-second M4A file. The frontend upload branch
`fix/bird-audio-server-contract` sends `kind: 'birdAudio'` while continuing
to send `kind: 'bird'` and `kind: 'observation'` for pictures.

The actual Apps Script source and project editor URL are not available in this
repository. Apply the change **inside the existing deployed project**, preserving
its `doPost`, Firebase ID-token verification, Firestore `uploadJobs` status
response, Drive owner account, image paths and existing deployment URL.

## Upload action

After authenticating the current administrator, branch on `kind` **before** the
image-only validation that currently throws `INVALID_IMAGE_TYPE`:

- For `kind === 'birdAudio'`, require a `data:audio/...;base64,...` payload,
  accept `audio/mp4` for `.m4a` or `audio/mpeg` for `.mp3`, enforce
  decoded bytes <= 5 MiB, and reject empty data. Check file extension, MIME
  and decoded size server-side; the web form's checks are only convenience.
- Decode the bytes and create a Google Drive file with the correct MIME type.
  Reuse the bird site's Drive folder or an audio subfolder owned by the same
  account. Preserve existing sharing behavior that lets anonymous students
  play published media; grant viewer access only, never edit access.
- Return the same success job shape as pictures, including `fileId`,
  `fileName`, `mimeType` and `size`. The image URL/thumbnail fields are
  irrelevant for audio.
- Keep image validation for `bird` and `observation`; do not remove or
  weaken the photo file type checks. Keep the existing `delete` action
  working for both media types (it receives the Drive `fileId`).

Pseudocode for the existing upload handler (names to adapt to the real source):

```js
if (payload.action === 'upload') {
  verifyAdminIdToken(payload.idToken); // preserve the existing implementation
  if (payload.kind === 'birdAudio') {
    const isM4a = /\.m4a$/i.test(payload.fileName);
    const isMp3 = /\.mp3$/i.test(payload.fileName);
    const expectedType = isM4a ? 'audio/mp4' : isMp3 ? 'audio/mpeg' : '';
    if (!expectedType || payload.mimeType !== expectedType) throw new Error('INVALID_AUDIO_TYPE');
    const match = /^data:audio\/(?:mp4|mpeg);base64,([A-Za-z0-9+/=]+)$/.exec(payload.dataBase64 || '');
    if (!match) throw new Error('INVALID_AUDIO_DATA');
    const bytes = Utilities.base64Decode(match[1]);
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('INVALID_AUDIO_SIZE');
    const blob = Utilities.newBlob(bytes, expectedType, safeAudioName(payload.fileName));
    const file = existingBirdFolder.createFile(blob);
    // Apply the project's existing public-read / link-view sharing policy.
    // Write {status:'success', fileId:file.getId(), fileName:file.getName(),
    //        mimeType:expectedType, size:bytes.length} to uploadJobs.
    return;
  }
  // Existing image-only upload branch follows untouched.
}
```

`safeAudioName` must remove path separators and control characters; use the
project's existing filename sanitizer if available. Do not paste this skeleton
over the full `doPost` implementation.

## Verification before enabling the branch

1. Upload a small phone M4A to an existing bird; verify the Firestore bird
   document gains `audio.driveFileId` and the student detail page plays it
   anonymously on iPhone Safari.
2. Upload an MP3 replacement and confirm the previous file is removed only
   after the new bird document is written.
3. Create a bird with no audio, then with audio. Upload a photo and an observation
   photo to ensure the old image paths still work.
4. Reject a non-audio file labeled M4A, oversized audio, and an unauthenticated
   request. Keep both validation and upload errors visible in the form.
5. Deploy a new version of the **existing Apps Script web app** so the frontend
   continues to use the same `/exec` URL.

The Apps Script project editor URL or its source files are needed to implement
and test this in the original service. The `/exec` deployment URL does not
provide access to the project source.
