import { Router, type IRouter } from 'express';
import * as gameController from '../controllers/game.controller.js';

const router: IRouter = Router();

router.post('/', gameController.createGame);
router.get('/', gameController.getAllGames);
router.get('/:id', gameController.getGameById);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);

export default router;
