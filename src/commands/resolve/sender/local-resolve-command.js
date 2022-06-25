const Command = require('../../command');
const { HANDLER_ID_STATUS } = require('../../../constants/constants');

class LocalResolveCommand extends Command {
    constructor(ctx) {
        super(ctx);
        this.config = ctx.config;
        this.handlerIdService = ctx.handlerIdService;
        this.tripleStoreModuleManager = ctx.tripleStoreModuleManager;
        this.commandExecutor = ctx.commandExecutor;
        this.dataService = ctx.dataService;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     */
    async execute(command) {
        const { handlerId, assertionId } = command.data;
        await this.handlerIdService.updateHandlerIdStatus(
            handlerId,
            HANDLER_ID_STATUS.RESOLVE.RESOLVE_LOCAL_START
        );

        
        const metadataNquads = await this.tripleStoreModuleManager.resolve(`${assertionId}#metadata`, true).catch(() => {
            // continue sequence, try to resolve from network
        });
        const dataNquads = await this.tripleStoreModuleManager.resolve(`${assertionId}#data`, true).catch(() => {
            // continue sequence, try to resolve from network
        });
        if (metadataNquads && metadataNquads.length && dataNquads && dataNquads.length) {
            const nquads = {
                metadataNquads,
                dataNquads
            }
            try {
                nquads.metadataNquads = await this.dataService.toNQuads(nquads.metadataNquads , 'application/n-quads');
                nquads.dataNquads = await this.dataService.toNQuads(nquads.dataNquads , 'application/n-quads');

                await this.handlerIdService.cacheHandlerIdData(handlerId, nquads);
                await this.handlerIdService.updateHandlerIdStatus(
                    handlerId,
                    HANDLER_ID_STATUS.COMPLETED,
                );

                return Command.empty();
            } catch (e) {
                await this.handlerIdService.updateHandlerIdStatus(handlerId, HANDLER_ID_STATUS.FAILED, e.message);
                return Command.empty();
            }
        }
        await this.handlerIdService.updateHandlerIdStatus(
            handlerId,
            HANDLER_ID_STATUS.RESOLVE.RESOLVE_LOCAL_END
        );

        return this.continueSequence(command.data, command.sequence);
    }

    /**
     * Builds default localResolveCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'localResolveCommand',
            delay: 0,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = LocalResolveCommand;
