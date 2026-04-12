const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { addFavorite, removeFavorite, getFavorites, getFavoriteIds } = require('../controllers/favoriteController')

const router = express.Router()

router.use(authenticate)
router.get('/', getFavorites)
router.get('/ids', getFavoriteIds)
router.post('/:roomId', addFavorite)
router.delete('/:roomId', removeFavorite)

module.exports = router
