import { Router, type IRouter } from 'express';
import * as gameController from '../controllers/game.controller.js';

// Rutas CRUD montadas bajo el prefijo /api/games en app.ts con express
const router: IRouter = Router();

router.post('/', gameController.createGame);      // Crear juego
router.get('/', gameController.getAllGames);      // Listar todos
router.get('/:id', gameController.getGameById);   // Obtener por id
router.put('/:id', gameController.updateGame);    // Actualizar
router.delete('/:id', gameController.deleteGame); // Eliminar

export default router;
