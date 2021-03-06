const jwt = require('jsonwebtoken');
const RateLimit = require('express-rate-limit');

// 로그인 성공여부
exports.isLoggedIn = (req, res, next) => {
    // isAuthenticated() 로그인 여부를 알려준다.
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send('로그인 필요')
    }
}

// 로그인을 안 했을경우
exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

exports.verifyToken = (req, res, next) => {
    // try에서 검증시도
    try {
        // 검증할 때 JWT_SECREET이 필요하다. JWT_SECREET은 절대로 노출되어서 안된다.
        // 토큰요청은 http헤더의 authorization에 토큰을 넣어서 서버에 보낸다. 
        req.decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        // 유효하지 않을 때나 (내가 만든 토큰이 아닐 때), 토큰 유효 기간이 만료되었을 때 에러가 발생한다.
        if (error.name == 'TokenExpiredError') {
            // 토큰은 기간은 짧게주고 재 발급많이하는 방법도 좋다.
            // v1.js에 보면 [expiresIn: '1m'] 라는 것이 발급시간을 가리킨다.
            return res.status(419).json({
                code: 419,
                message: '토큰이 만료되었습니다.'
            });
        }
        return res.status(401).json({
            code: 401,
            message: '유효하지 않은 토큰입니다.'
        });
    }
}

// 사용량 제한 설정 (무료인거)
exports.apiLimiter = new RateLimit({
    windowMs: 60 * 1000, // 1분
    max: 100,
    delayMs: 0,
    handler(req, res) {
      res.status(this.statusCode).json({
        code: this.statusCode, // 기본값 429
        message: '무료 사용자는 1분에 한 번만 요청할 수 있습니다.',
      });
    },
  });

  // 유료인 API
exports.premiumAPiLimiter = new RateLimit({
    windowMs: 60 * 1000, // 1분
    max: 100,
    delayMs: 0,
    handler(req, res) {
      res.status(this.statusCode).json({
        code: this.statusCode, // 기본값 429
        message: '유료 사용자는 1분에 1000번 요청할 수 있습니다.',
      });
    },
  });
  
  exports.deprecated = (req, res) => {
    res.status(410).json({
      code: 410,
      message: '새로운 버전이 나왔습니다. 새로운 버전을 사용하세요.',
    });
  };