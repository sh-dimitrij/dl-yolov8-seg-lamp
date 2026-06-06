import onnxruntime as ort
import numpy as np

session = ort.InferenceSession("public/model/model.onnx")
dummy = np.zeros((1, 3, 640, 640), dtype=np.float32)
out = session.run(None, {"images": dummy})
print("Output shapes:", [o.shape for o in out])