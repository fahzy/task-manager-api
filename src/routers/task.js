const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const Task = require('../models/task')

router.post('/tasks', auth, async (req, res)=>{
    // const task = new Task(req.body)
    const task = new Task({
        ...req.body, // copys all the properties from body
        owner: req.user._id // creates association
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=2
// GET /tasks?sortBy=createdAt_asc
router.get('/tasks', auth, async (req, res)=>{
    const match = {}
    const sort = {}
    if(req.query.completed){
        match.completed = req.query.completed === 'true'
    }

    if(req.query.sortBy){
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        // const tasks = await Task.find({owner: req.user._id})
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.status(200).send(req.user.tasks)
    } catch (e) {
        res.send(500).send()
    }
})

router.get('/tasks/:id', auth, async (req, res)=>{
    const _id = req.params.id

    try {
        // const task = await Task.findById(_id)

        const task = await Task.findOne({_id, owner: req.user._id})
        if(!task) return res.status(404).send()
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.patch('/tasks/:id', auth, async (req, res)=>{
    const Updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = Updates.every((updates)=> allowedUpdates.includes(updates))

    if(!isValidOperation){
        return res.status(400).send({"Error": "Invalid Updates!"})
    }

    try {
        const task = await Task.findOne({_id: req.params.id, owner: req.user._id})
        // const task = await Task.findById(req.params.id)

        //const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if(!task){
            return res.status(404).send()
        }

        Updates.forEach((update)=>{
            task[update] = req.body[update]
        })
        await task.save()

        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id', auth, async (req, res)=>{
    try {
        const task = await Task.findOneAndDelete({_id: req.params.id, owner: req.user._id})
        if(!task) return res.status(404).send()
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router