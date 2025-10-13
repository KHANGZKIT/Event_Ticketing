import { CreateShowSchema, UpdateShowSchema } from './shows.schema.js';
import * as svc from './shows.service.js';
export const getShow = async (req, res, next) => {
    try {
        res.json(await svc, getShow(req.params.id));
    } catch (e) {
        next(e);
    }
}

export const createShow = async (req, res, next) => {
    try {
        const data = CreateShowSchema.parse(req.body);
        res.status(201).json(await svc.createShow(data));
    } catch (e) {
        next(e);
    }
}

export const updateShow = async (req, res, next) => {
    try {
        const data = UpdateShowSchema.parse(req.body);
        res.json(await svc.updateShow(req.params.id, data));
    } catch (e) {
        next(e);
    }
}

export const deleteShow = async (req, res, next) => {
    try {
        await svc.deleteShow(req.params.id);
        res.status(204).end();
    } catch (e) {
        next(e);
    }
}

export const getSeatMap = async (req, res, next) => {
    try {
        res.json(await svc.getSeatMap(req.params.id));
    } catch (e) {
        next(e);
    }
}

export const getAvailability = async (req, res, next) => {
    try {
        res.json(await svc.getAvailability(req.params.id));
    } catch (e) {
        next(e);
    }
}



