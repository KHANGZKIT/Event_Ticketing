import { CreateEventSchema, UpdateEventSchema } from './events.schema.js';
import * as svc from './events.service.js';
export const listEvents = async (req, res, next) => {
    try {
        res.json(await svc.listEvents(req.query));

    } catch (e) {
        next(e);
    }
};

export const getEvent = async (req, res, next) => {
    try {
        res.json(await svc.getEvent(req.params.id));
    } catch (e) {
        next(e);
    }
};

export const listShowsOfEvent = async (req, res, next) => {
    try {
        res.json(await svc.listShowsOfEvent(req.params.id, req.query));
    } catch (e) {
        next(e);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        const data = CreateEventSchema.parse(req.body);
        res.status(201).json(await svc.createEvent(req.body));
    } catch (e) {
        next(e);
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const data = UpdateEventSchema.parse(req.body);
        res.json(await svc.updateEvent(req.params.id, data));
    } catch (e) {
        next(e);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        await svc.deleteEvent(req.params.id);
        res.json(await svc.deleteEvent(req.params.id));
        res.status(204).end();
    } catch (e) {
        next(e);
    }
};
