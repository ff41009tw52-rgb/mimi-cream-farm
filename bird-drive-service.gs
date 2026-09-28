const FIREBASE_API_KEY = 'AIzaSyC26_dnG8mHcIepXQMGOX-_-4ulJok9NWQ';
const FIREBASE_PROJECT_ID = 'bird-650fa';

const ADMIN_UID = 'wJ6v4ChXyUV0SLvh581L3K6ZEZB3';

const BIRD_FOLDER_ID = '1E7jj4wDkgcTkhVus2Q-tnW1o-CG5ZjOW';
const OBS_FOLDER_ID = '1cpo_RTFtUGsJ9VnwJ5nr1p1dyZOcWXc4';

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;


/* =========================================================
   Web App
   ========================================================= */

function doGet() {
  return jsonOutput_({
    ok: true,
    service: '民安羽跡圖片服務',
    version: '3.2.0'
  });
}


function doPost(e) {
  let body = null;
  let idToken = '';
  let jobId = '';

  try {
    body = parseRequest_(e);

    idToken = String(body.idToken || '');
    jobId = validateJobId_(body.jobId);

    const user = verifyAdmin_(idToken);

    let result;

    if (body.action === 'ping') {
      result = {
        ok: true,
        uid: user.localId,
        service: '民安羽跡圖片服務',
        version: '3.2.0'
      };
    }

    else if (body.action === 'upload') {
      result = body.kind === 'birdAudio'
        ? uploadAudio_(body, user)
        : uploadImage_(body, user);
    }

    else if (body.action === 'delete') {
      result = deleteImage_(body);
    }

    else {
      throw new Error('UNKNOWN_ACTION');
    }


    writeJob_(idToken, jobId, {
      status: 'success',
      action: body.action,
      ...result,
      updatedAt: new Date().toISOString()
    });


    return jsonOutput_({
      ok: true,
      jobId: jobId
    });

  } catch (err) {

    const message =
      err && err.message
        ? err.message
        : String(err);


    // 能寫回 Firestore 的話，把真正錯誤放進 uploadJobs
    if (idToken && jobId) {
      try {
        writeJob_(idToken, jobId, {
          status: 'error',
          error: message,
          updatedAt: new Date().toISOString()
        });
      } catch (_) {}
    }


    return jsonOutput_({
      ok: false,
      error: message,
      jobId: jobId || null
    });
  }
}


/* =========================================================
   上傳
   ========================================================= */

function uploadImage_(body, user) {

  if (
    body.kind !== 'bird' &&
    body.kind !== 'observation'
  ) {
    throw new Error('INVALID_KIND');
  }


  if (!body.fileName) {
    throw new Error('MISSING_FILENAME');
  }


  if (
    !body.mimeType ||
    !String(body.mimeType).startsWith('image/')
  ) {
    throw new Error('INVALID_IMAGE_TYPE');
  }


  if (!body.dataBase64) {
    throw new Error('MISSING_IMAGE_DATA');
  }


  const cleanBase64 =
    String(body.dataBase64)
      .replace(/^data:[^;]+;base64,/, '');


  const bytes =
    Utilities.base64Decode(cleanBase64);


  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error(
      'FILE_TOO_LARGE_' +
      Math.round(bytes.length / 1024 / 1024) +
      'MB'
    );
  }


  const folderId =
    body.kind === 'bird'
      ? BIRD_FOLDER_ID
      : OBS_FOLDER_ID;


  const folder =
    DriveApp.getFolderById(folderId);


  const safeName =
    sanitizeFileName_(body.fileName);


  const blob =
    Utilities.newBlob(
      bytes,
      body.mimeType,
      safeName
    );


  const file =
    folder.createFile(blob);


  try {

    file.setDescription(
      JSON.stringify({
        source: '民安羽跡',
        kind: body.kind,
        firebaseUid: user.localId,
        uploadedAt: new Date().toISOString()
      })
    );


    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

  } catch (err) {

    try {
      file.setTrashed(true);
    } catch (_) {}


    throw new Error(
      'DRIVE_PUBLIC_SHARING_FAILED: ' +
      (
        err && err.message
          ? err.message
          : String(err)
      )
    );
  }


  const fileId = file.getId();


  return {
    fileId: fileId,

    fileName: file.getName(),

    mimeType: file.getMimeType(),

    size: file.getSize(),

    kind: body.kind,

    imageUrl:
      'https://drive.google.com/uc?export=view&id=' +
      encodeURIComponent(fileId),

    thumbnailUrl:
      'https://drive.google.com/thumbnail?id=' +
      encodeURIComponent(fileId) +
      '&sz=w2000',

    driveUrl:
      file.getUrl()
  };
}


/* =========================================================
   鳥叫錄音
   ========================================================= */

function uploadAudio_(body, user) {
  if (!body.fileName) throw new Error('MISSING_FILENAME');
  if (!body.dataBase64) throw new Error('MISSING_AUDIO_DATA');

  const fileName = String(body.fileName);
  const extension = /\.m4a$/i.test(fileName)
    ? 'm4a'
    : /\.mp3$/i.test(fileName) ? 'mp3' : '';
  const mimeType = extension === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
  if (!extension || body.mimeType !== mimeType) {
    throw new Error('INVALID_AUDIO_TYPE');
  }

  const encoded = String(body.dataBase64);
  const prefix = encoded.match(/^data:([^;,]+);base64,/i);
  if (prefix && ![
    mimeType,
    ...(extension === 'm4a' ? ['audio/x-m4a', 'audio/m4a'] : ['audio/mp3']),
    'application/octet-stream'
  ].includes(prefix[1].toLowerCase())) {
    throw new Error('INVALID_AUDIO_TYPE');
  }
  const cleanBase64 = prefix ? encoded.slice(prefix[0].length) : encoded;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 !== 0) {
    throw new Error('INVALID_AUDIO_DATA');
  }
  // Reject oversized input before decoding it into Apps Script memory.
  if (cleanBase64.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) {
    throw new Error('FILE_TOO_LARGE_5MB');
  }
  const bytes = Utilities.base64Decode(cleanBase64);
  if (!bytes.length) throw new Error('MISSING_AUDIO_DATA');
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('FILE_TOO_LARGE_5MB');

  // File extensions and browser MIME hints can be changed; check the contents too.
  const byte = index => bytes[index] & 255;
  const m4a = bytes.length >= 12 &&
    byte(4) === 0x66 && byte(5) === 0x74 &&
    byte(6) === 0x79 && byte(7) === 0x70;
  const mp3 = bytes.length >= 3 && (
    (byte(0) === 0x49 && byte(1) === 0x44 && byte(2) === 0x33) ||
    (byte(0) === 0xff && (byte(1) & 0xe0) === 0xe0)
  );
  if (extension === 'm4a' ? !m4a : !mp3) {
    throw new Error('INVALID_AUDIO_TYPE');
  }

  const folder = DriveApp.getFolderById(BIRD_FOLDER_ID);
  const safeName = sanitizeFileName_(fileName).replace(/[\x00-\x1f\x7f]/g, '_');
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, safeName));
  try {
    file.setDescription(JSON.stringify({
      source: '民安羽跡',
      kind: 'birdAudio',
      firebaseUid: user.localId,
      uploadedAt: new Date().toISOString()
    }));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    try { file.setTrashed(true); } catch (_) {}
    throw new Error('DRIVE_PUBLIC_SHARING_FAILED: ' +
      (err && err.message ? err.message : String(err)));
  }

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    kind: 'birdAudio',
    driveUrl: file.getUrl()
  };
}


/* =========================================================
   刪除
   ========================================================= */

function deleteImage_(body) {

  if (!body.fileId) {
    throw new Error('MISSING_FILE_ID');
  }


  const file =
    DriveApp.getFileById(body.fileId);


  const parents =
    file.getParents();


  let allowed = false;


  while (parents.hasNext()) {

    const id =
      parents.next().getId();


    if (
      id === BIRD_FOLDER_ID ||
      id === OBS_FOLDER_ID
    ) {
      allowed = true;
      break;
    }
  }


  if (!allowed) {
    throw new Error(
      'FILE_NOT_IN_ALLOWED_FOLDER'
    );
  }


  file.setTrashed(true);


  return {
    deletedFileId: body.fileId
  };
}


/* =========================================================
   Firebase 身分驗證
   ========================================================= */

function verifyAdmin_(idToken) {

  if (!idToken) {
    throw new Error(
      'MISSING_FIREBASE_TOKEN'
    );
  }


  const url =
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
    encodeURIComponent(FIREBASE_API_KEY);


  const response =
    UrlFetchApp.fetch(url, {

      method: 'post',

      contentType:
        'application/json',

      payload:
        JSON.stringify({
          idToken: idToken
        }),

      muteHttpExceptions: true
    });


  const status =
    response.getResponseCode();


  let data;


  try {

    data =
      JSON.parse(
        response.getContentText()
      );

  } catch (_) {

    throw new Error(
      'FIREBASE_INVALID_RESPONSE'
    );
  }


  if (status !== 200) {

    throw new Error(
      data &&
      data.error &&
      data.error.message
        ? data.error.message
        : 'FIREBASE_TOKEN_VERIFY_FAILED'
    );
  }


  if (
    !data.users ||
    !data.users.length
  ) {

    throw new Error(
      'FIREBASE_USER_NOT_FOUND'
    );
  }


  const user =
    data.users[0];


  if (
    user.localId !== ADMIN_UID
  ) {

    throw new Error(
      'UNAUTHORIZED_UID'
    );
  }


  return user;
}


/* =========================================================
   將結果寫回 Firestore
   ========================================================= */

function writeJob_(
  idToken,
  jobId,
  data
) {

  const documentUrl =
    'https://firestore.googleapis.com/v1/projects/' +
    FIREBASE_PROJECT_ID +
    '/databases/(default)/documents/' +
    'artifacts/minan-birds-v2/public/data/uploadJobs/' +
    encodeURIComponent(jobId);


  const fields = {};


  Object.keys(data).forEach(
    function(key) {

      const value = data[key];

      if (
        value === undefined ||
        value === null
      ) {
        return;
      }


      if (
        typeof value === 'number'
      ) {

        fields[key] = {
          integerValue:
            String(
              Math.round(value)
            )
        };

      }

      else if (
        typeof value === 'boolean'
      ) {

        fields[key] = {
          booleanValue: value
        };

      }

      else {

        fields[key] = {
          stringValue:
            String(value)
        };
      }
    }
  );


  const response =
    UrlFetchApp.fetch(
      documentUrl + '?' + Object.keys(fields).map(function(key) {
        return 'updateMask.fieldPaths=' + encodeURIComponent(key);
      }).join('&'),
      {

        method: 'patch',

        contentType:
          'application/json',

        headers: {
          Authorization:
            'Bearer ' + idToken
        },

        payload:
          JSON.stringify({
            fields: fields
          }),

        muteHttpExceptions:
          true
      }
    );


  const code =
    response.getResponseCode();


  if (
    code < 200 ||
    code >= 300
  ) {

    throw new Error(
      'FIRESTORE_JOB_WRITE_FAILED_' +
      code +
      ': ' +
      response.getContentText()
    );
  }
}


/* =========================================================
   Request
   ========================================================= */

function parseRequest_(e) {

  // 新網站會用一般 HTML form POST：
  // payload = JSON 字串

  if (
    e &&
    e.parameter &&
    e.parameter.payload
  ) {

    try {

      return JSON.parse(
        e.parameter.payload
      );

    } catch (_) {

      throw new Error(
        'INVALID_FORM_PAYLOAD'
      );
    }
  }


  // 同時保留 JSON POST 相容

  if (
    e &&
    e.postData &&
    e.postData.contents
  ) {

    try {

      return JSON.parse(
        e.postData.contents
      );

    } catch (_) {

      throw new Error(
        'INVALID_JSON'
      );
    }
  }


  throw new Error(
    'EMPTY_REQUEST'
  );
}


function validateJobId_(value) {

  const id =
    String(value || '');


  if (
    !/^[A-Za-z0-9_-]{8,120}$/
      .test(id)
  ) {

    throw new Error(
      'INVALID_JOB_ID'
    );
  }


  return id;
}


/* =========================================================
   Utilities
   ========================================================= */

function sanitizeFileName_(name) {

  return String(name)

    .replace(
      /[\\/:*?"<>|]/g,
      '_'
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim()

    .slice(0, 150)

    ||
    (
      'bird_' +
      Date.now() +
      '.jpg'
    );
}


function jsonOutput_(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/* =========================================================
   手動檢查
   ========================================================= */

function setupCheck() {

  const bird =
    DriveApp.getFolderById(
      BIRD_FOLDER_ID
    );


  const obs =
    DriveApp.getFolderById(
      OBS_FOLDER_ID
    );


  Logger.log(
    '鳥種照片：' +
    bird.getName()
  );


  Logger.log(
    '觀察照片：' +
    obs.getName()
  );


  Logger.log(
    '設定檢查完成'
  );
}


function driveWriteCheck() {

  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2xQAAAAASUVORK5CYII=';


  const blob =
    Utilities.newBlob(
      Utilities.base64Decode(
        base64
      ),
      'image/png',
      '民安羽跡_上傳測試.png'
    );


  const folder =
    DriveApp.getFolderById(
      BIRD_FOLDER_ID
    );


  const file =
    folder.createFile(blob);


  Logger.log(
    '測試圖片建立成功：' +
    file.getId()
  );


  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );


  Logger.log(
    '公開權限成功'
  );


  file.setTrashed(true);


  Logger.log(
    '測試圖片已刪除'
  );


  Logger.log(
    'Drive 測試全部成功'
  );
}
