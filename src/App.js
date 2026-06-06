import React, { useState, useRef } from "react";
import cv from "@techstark/opencv-js";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { detectImage } from "./utils/detect";
import { CLASS_INFO, CLASS_LABELS_RU } from "./utils/renderBox";
import { LABEL_TO_CATEGORY } from "./utils/searchItems";
import { cropSegmentsByLabel } from "./utils/cropSegment";
import { useClipSearch } from "./hooks/useClipSearch";
import ClipResultsSection from "./components/ClipResultsSection";
import "./style/App.css";
import { env } from "onnxruntime-web";
env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";

const CLASS_COLORS = {
  table_lamp: "#583EE0",
  luminaire:  "#C5A23F",
  chandelier: "#34D1B7",
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: null });
  const [image, setImage] = useState(null);
  const [detectedKeys, setDetectedKeys] = useState(null);
  const inputImage = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  const modelName = "model.onnx";
  const modelInputShape = [1, 3, 640, 640];
  const topk = 100;
  const iouThreshold = 0.45;
  const scoreThreshold = 0.21;

  const {
    clipReady,
    clipLoading,
    clipProgress,
    clipError,
    clipItems,
    searchSegments,
    resetClipResults,
  } = useClipSearch();

  cv["onRuntimeInitialized"] = async () => {
    setLoading({ text: "Loading model...", progress: null });
    const yolov8 = await InferenceSession.create(`${process.env.PUBLIC_URL}/model/model.onnx`);
    setLoading({ text: "Warming up nms...", progress: null });
    const nms = await InferenceSession.create(`${process.env.PUBLIC_URL}/model/nms-yolov8.onnx`);
    setLoading({ text: "Warming up mask...", progress: null });
    const mask = await InferenceSession.create(`${process.env.PUBLIC_URL}/model/mask-yolov8-seg.onnx`);
    setLoading({ text: "Warming up model...", progress: null });
    const tensor = new Tensor(
      "float32",
      new Float32Array(modelInputShape.reduce((a, b) => a * b)),
      modelInputShape
    );
    await yolov8.run({ images: tensor });
    setSession({ net: yolov8, nms: nms, mask: mask });
    setLoading(null);
  };

  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress ? `${loading.text} - ${loading.progress}%` : loading.text}
        </Loader>
      )}

      <div className="header">
        <h1>SuperLampScanner</h1>
        <p className="header-sub">Сегментация светильников | YOLOv8</p>
        <p>Модель: <code className="code">{modelName}</code></p>
      </div>

      <div className="content">
        <img
          ref={imageRef}
          src="#"
          alt=""
          style={{ display: image ? "block" : "none" }}
          onLoad={() => {
            setDetectedKeys(null);
            resetClipResults();
            detectImage(
              imageRef.current,
              canvasRef.current,
              session,
              topk,
              iouThreshold,
              scoreThreshold,
              modelInputShape
            ).then((boxes) => {
              const seen = new Set();
              const uniqueKeys = [];
              for (const box of boxes) {
                if (!seen.has(box.label)) {
                  seen.add(box.label);
                  uniqueKeys.push(box.label);
                }
              }
              setDetectedKeys(uniqueKeys);

              if (boxes.length > 0 && clipReady) {
                const croppedMap = cropSegmentsByLabel(imageRef.current, boxes, modelInputShape);
                const segments = Object.entries(croppedMap).map(([yoloLabel, dataUrl]) => ({
                  categoryKey: LABEL_TO_CATEGORY[yoloLabel] || yoloLabel,
                  dataUrl,
                }));
                if (segments.length > 0) searchSegments(segments);
              }
            });
          }}
        />
        <canvas
          id="canvas"
          width={modelInputShape[2]}
          height={modelInputShape[3]}
          ref={canvasRef}
        />
      </div>

      <input
        type="file"
        ref={inputImage}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (image) {
            URL.revokeObjectURL(image);
            setImage(null);
          }
          const url = URL.createObjectURL(e.target.files[0]);
          imageRef.current.src = url;
          setImage(url);
        }}
      />

      <div className="btn-container">
        <button onClick={() => { inputImage.current.click(); }}>
          Загрузить изображение
        </button>
        {image && (
          <button
            onClick={() => {
              inputImage.current.value = "";
              imageRef.current.src = "#";
              URL.revokeObjectURL(image);
              setImage(null);
              setDetectedKeys(null);
              resetClipResults();
            }}
          >
            Закрыть
          </button>
        )}
      </div>

      {/* Карточки классов — только после детекции */}
      {detectedKeys !== null && detectedKeys.length > 0 && (
        <div className="info-section">
          <div className="section-label">Обнаружено на изображении</div>
          <div className="class-legend">
            {detectedKeys.map((key) => {
              const info  = CLASS_INFO[key];
              const color = CLASS_COLORS[key] || "#888";
              return (
                <div className="class-card" key={key}>
                  <div className="class-card-header" style={{ borderBottom: `2px solid ${color}40` }}>
                    <span className="class-dot" style={{ background: color }} />
                    <h3>{CLASS_LABELS_RU[key]}</h3>
                  </div>
                  <div className="class-card-body">
                    <p className="class-card-desc">{info.description}</p>
                    <div className="class-params">
                      {info.params.map((p) => (
                        <div className="class-param-row" key={p.name}>
                          <span className="param-name" style={{ color }}>{p.name}</span>
                          <span className="param-value">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLIP — карточки видны всегда, сортируются после детекции */}
      <ClipResultsSection
        clipReady={clipReady}
        clipLoading={clipLoading}
        clipProgress={clipProgress}
        clipError={clipError}
        clipItems={clipItems}
      />

    </div>
  );
};

export default App;