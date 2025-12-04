// import express from 'express';
// import BorrowRequest from '../models/BorrowRequest.js';
// import { verifyFirebaseToken } from '../middlewares/verifyFirebaseToken.js';
// import { authorizeRole } from '../middlewares/authorizeRole.js';

// const router = express.Router();

// // Member creates borrow request
// router.post('/', verifyFirebaseToken, authorizeRole(['member']), async (req, res) => {
//   const request = await BorrowRequest.create({
//     user: req.user._id,
//     item: req.body.item,
//     reason: req.body.reason
//   });
//   res.status(201).json(request);
// });

// // Admin views all requests
// router.get('/admin', verifyFirebaseToken, authorizeRole(['admin']), async (req, res) => {
//   const requests = await BorrowRequest.find().populate('user');
//   res.json(requests);
// });

// // Admin updates request status
// router.patch('/admin/:id', verifyFirebaseToken, authorizeRole(['admin']), async (req, res) => {
//   const updated = await BorrowRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
//   res.json(updated);
// });

// export default router;