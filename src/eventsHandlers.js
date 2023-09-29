const storyDeleteHandler = require('./eventsHandlers/storyDeleteHandler');
const storyPublishHandler = require('./eventsHandlers/storyPublishHandler');
const storyRepublishHandler = require('./eventsHandlers/storyRepublishHandler');
const storyUnpublishHandler = require('./eventsHandlers/storyUnpublishHandler');

module.exports = {
  storyDeleteHandler,
  storyPublishHandler,
  storyRepublishHandler,
  storyUnpublishHandler,
}