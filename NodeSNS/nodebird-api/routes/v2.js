// v2를 시작하면 v1사용하지 못하게 한다.
// v1에서 apiLimiter를 추가한 v2이다.
// v1 라우터를 못 사용하게 해야한다.
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const url = require('url');

const { verifyToken, premiumAPiLimiter, apiLimiter } = require('./middlewares');
const { Domain, User, Post, Hashtag } = require('../models');

const router = express.Router();
// cors를 사용한다. 의미는 
// router.use(cors()); // 단순하게 사용하지말고 커스터마이징 사용하는 방법도 있다.
router.use(async (req, res, next) => {
  const domain = await Domain.findOne({
    where: {
      // 먼저 뒷 부분에 host가 localhost:8003이다.
      host: url.parse(req.get('origin')).host 
      // 여기 의미가 nodebird-api에서 등록된 DB의 API만 도메인 주소를 사용하는 것을 허용해준다. 
      // 등록된 것만 허용된다. 
    },
  });
  // domain DB데이터에 등록 되어있으면 접근허용한다.
  if (domain) {
    cors({origin: req.get('origin')})(req,res, next);
  } else {
    next();
  }
});
// 미들웨어 안에 미들웨어를 넣어 커스터마이징할 수 있다.

// API 유료 or 무료 검사하는 곳
router.use((req, res, next) => {
  const domain = await Domain.findOne({
    where: {host: url.parse(req.get('origin').host)},
  });
  if (domain.type === 'premium') {
    premiumAPiLimiter(req, res, next);
  } else {
    apiLimiter(req, res, next);
  }
});

router.post('/token', async (req, res) => {
  const { clientSecret } = req.body;
  try {
    const domain = await Domain.findOne({
      where: { clientSecret },
      include: {
        model: User,
        attribute: ['nick', 'id'],
      },
    });
    if (!domain) {
      return res.status(401).json({
        code: 401,
        message: '등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
      });
    }
    const token = jwt.sign({
      id: domain.user.id,
      nick: domain.user.nick,
    }, process.env.JWT_SECRET, {
      expiresIn: '30m', // 30분
      issuer: 'nodebird',
    });
    return res.json({
      code: 200,
      message: '토큰이 발급되었습니다',
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      code: 500,
      message: '서버 에러',
    });
  }
});

router.get('/test', verifyToken, (req, res) => {
  res.json(req.decoded);
});

router.get('/posts/my', verifyToken, (req, res) => {
  Post.findAll({ where: { userId: req.decoded.id } })
    .then((posts) => {
      console.log(posts);
      res.json({
        code: 200,
        payload: posts,
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({
        code: 500,
        message: '서버 에러',
      });
    });
});

router.get('/posts/hashtag/:title', verifyToken, async (req, res) => {
  try {
    const hashtag = await Hashtag.findOne({ where: { title: req.params.title } });
    if (!hashtag) {
      return res.status(404).json({
        code: 404,
        message: '검색 결과가 없습니다',
      });
    }
    const posts = await hashtag.getPosts();
    return res.json({
      code: 200,
      payload: posts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      code: 500,
      message: '서버 에러',
    });
  }
});

//팔로워 팔로잉 목록 API 만들기
router.get('/follow', verifyToken, async(req, res) => {
  try {
    const user = await User.findOne({ 
      where: {
        id: req.decoded.id
      }
    });
    const follower = await user.getFollowers({
      attributes: ['id', 'nick']
    });
    const following = await user.getFollowings({
      attributes: ['id', 'nick']
    });
    return res.json ({
      code: 200,
      follower,
      following,
    })
  } catch ( error ) {
    console.error(error);
    return res.status(500).json({
      code: 500,
      message: `서버 에러`,
    });
  }
});

module.exports = router;