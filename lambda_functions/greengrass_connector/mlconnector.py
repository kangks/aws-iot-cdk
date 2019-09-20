import logging
from threading import Timer
import sys
import numpy as np
import greengrass_machine_learning_sdk as ml
from data_source.static_images import image_source

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.INFO)

source = image_source.ImageSource()

# images=['test_img/beer_mug.jpg','test_img/wine_bottle.jpg']
# index=0
CATEGORIES = ['beer-mug', 'clutter', 'coffee-mug', 'soda-can', 'wine-bottle']

ml_client = ml.client('inference')

def infer():
    # global index
    logging.debug('invoking Greengrass ML Inference service')

    try:
        # index = (index + 1 ) % 2
        # image_name = images[index]
        # logging.info('image name: {}'.format(image_name))
        # f = open(image_name, "rb")
        content = source.get_image()        
        # content = bytearray(f.read())

        resp = ml_client.invoke_inference_service(
            AlgoType='image-classification',
            ServiceName='image-classification',
            ContentType='image/jpeg',
            Body=content
        )
    except ml.GreengrassInferenceException as e:
        logging.exception('inference exception {}("{}")'.format(e.__class__.__name__, e))
        return
    except ml.GreengrassDependencyException as e:
        logging.exception('dependency exception {}("{}")'.format(e.__class__.__name__, e))
        return
    except Exception as e:
        logging.fatal(e, exc_info=True)
        return

    logging.debug('resp: {}'.format(resp))

    predictions = resp['Body'].read()
    logging.info('predictions: {}'.format(predictions))

    # The connector output is in the format: [0.3,0.1,0.04,...]
    # Remove the '[' and ']' at the beginning and end.
    predictions = predictions[1:-1]
    predictions_arr = np.fromstring(predictions, dtype=np.float, sep=',')
    logging.info('predictions_arr: {}'.format(predictions_arr))

    prediction_confidence = predictions_arr.max()
    predicted_category = CATEGORIES[predictions_arr.argmax()]
    logging.info('predicted_category: {}, confidence: {}'.format(predicted_category, prediction_confidence))

    # Perform business logic that relies on the predictions_arr, which is an array
    # of probabilities.
    
    # Schedule the infer() function to run again in one second.
    Timer(1, infer).start()
    return

infer()

def handler(event, context):
    return
