from logging import config, getLogger
import time
import os

from greengrass_machine_learning_sdk.exception import GreengrassDependencyException
from greengrass_machine_learning_sdk.inference import GreengrassInferenceException
from greengrass_machine_learning_sdk import client
from greengrass_ipc_python_sdk.ipc_facade import GreengrassServiceCallOutput, GreengrassServiceMessage, GreengrassRuntimeException

config.dictConfig({
  "version": 1,
  "disable_existing_loggers": False,
  "root": {
    "level": "INFO",
    "handlers": [
      "logFileHandler"
    ]
  },
  "handlers": {
    "logFileHandler": {
      "class": "logging.FileHandler",
      "level": "INFO",
      "formatter": "logFileFormatter",
      "filename": "/log/test.log",
      "mode": "w",
      "encoding": "utf-8"
    }
  },
  "formatters": {
    "logFileFormatter": {
      "format": "%(asctime)s|%(levelname)-8s|%(name)s|%(funcName)s|%(message)s"
    }
  }
})

logger = getLogger(__name__)
inference_client = client('inference')

while True:
    logger.info('hello!!!')
    time.sleep(5)
    
def handler(event, context):
  return