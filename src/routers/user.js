const express = require('express')
const router = new express.Router()
const User = require('../models/user')
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')

// When a function has async it always returns a promise
router.post('/users/signup', async (req, res)=>{
    const user = new User(req.body)
    const token = await user.generateAuthToken()
    // await can only be used inside of an async function
    try{
        await user.save()
        await res.status(201).send({user, token})
    } catch(e){
        // console.log('Error:',e)
        await res.status(400).send(e)
    }
    // Same as above but with async and await
    // user.save().then(()=>{
    //     res.status(201).send(user)
    // }).catch((e)=>{
    //     res.status(400).send(e)
    // })
})

router.post('/users/login', async (req, res)=>{
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (error) {
        res.status(400).send()
    }
})

router.post('/users/logout', auth, async (req, res)=>{
    try {
        req.user.tokens = req.user.tokens.filter((tokenzzz)=>{
            return tokenzzz.token !== req.token
        })

        await req.user.save()
        res.send()
    } catch (error) {
        res.status(500).send(error)
    }
})

router.post('/users/logoutAll', auth, async (req, res)=>{
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (error) {
        res.status(500).send(error)
    }
})


const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb){
        // cb(new Error('File must be a pdf')) // Things go wrong
        // cb(undefined, true) // Things go okay
        // cb(undefined, false) // Silently rejects upload

        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('The file must either be a jpg, jpeg or png.'))
        }

        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res)=>{
    const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()

    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next)=>{
    res.status(400).send({error: error.message})
})

router.get('/users/:id/avatar', async (req, res)=>{
    try {
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar){
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (error) {
        res.status(404).send()
    }
})

router.delete('/users/me/avatar', auth, upload.single('avatar'), async (req, res)=>{
    req.user.avatar = undefined
    await req.user.save()
    res.send()
}, (error, req, res, next)=>{
    res.status(400).send({error: error.message})
})

router.get('/users/me', auth, async (req, res)=>{
   res.send(req.user)
})

router.patch('/users/me', auth, async (req, res)=>{
    const Updates = Object.keys(req.body)       
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = Updates.every((updates)=>{
        return allowedUpdates.includes(updates)
    })

    if(!isValidOperation){
       return res.status(400).send({"Error": "Invalid Updates!"})
    }

    try {        
        Updates.forEach((update)=>{
            req.user[update] = req.body[update]
        })

        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.delete('/users/me', auth, async (req, res)=>{
    try {
        // const user = await User.findByIdAndDelete(req.user._id)
        // if(!user){
        //     return res.status(404).send()
        // }       
        await req.user.remove()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router