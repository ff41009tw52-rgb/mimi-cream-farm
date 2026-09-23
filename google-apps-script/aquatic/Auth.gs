function base64UrlEncode_(value) {
  var bytes = typeof value === 'string'
    ? Utilities.newBlob(value).getBytes()
    : value;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function base64UrlDecodeText_(value) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(value)).getDataAsString('UTF-8');
}

function tokenSecret_() {
  var properties = PropertiesService.getScriptProperties();
  var secret = properties.getProperty('TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('TOKEN_SECRET', secret);
  }
  return secret;
}

function sign_(payload) {
  return base64UrlEncode_(Utilities.computeHmacSha256Signature(payload, tokenSecret_()));
}

function safeEqual_(left, right) {
  var a = String(left == null ? '' : left);
  var b = String(right == null ? '' : right);
  if (a.length !== b.length) return false;
  var result = 0;
  for (var index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function makeToken_(role, subject, lifetimeSeconds) {
  var payload = base64UrlEncode_(JSON.stringify({
    role: role,
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
    nonce: Utilities.getUuid()
  }));
  return payload + '.' + sign_(payload);
}

function verifyToken_(token, expectedRole) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || !safeEqual_(parts[1], sign_(parts[0]))) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  var payload;
  try {
    payload = JSON.parse(base64UrlDecodeText_(parts[0]));
  } catch (error) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  if (payload.role !== expectedRole || !payload.sub || Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  return payload;
}

function requireStudent_(token) {
  var payload = verifyToken_(token, 'student');
  var student = findStudentById_(payload.sub);
  if (!student) throw apiError_('找不到學生觀察簿，請重新登入。', 401);
  return student;
}

function requireTeacher_(token) {
  verifyToken_(token, 'teacher');
}

function teacherLogin_(password) {
  var configured = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD');
  if (!configured) throw apiError_('教師端尚未設定。', 503);
  if (!safeEqual_(password, configured)) throw apiError_('教師密碼不正確。', 401);
  return {
    token: makeToken_('teacher', 'dashboard', AQUATIC_CONFIG.teacherTokenSeconds),
    expiresIn: AQUATIC_CONFIG.teacherTokenSeconds
  };
}
