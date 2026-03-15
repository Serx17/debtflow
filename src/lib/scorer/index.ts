export { extractFeatures, type DebtorRow, type FeatureVector } from "./features"
export {
  trainSynthetic,
  predict,
  type LogisticCoefficients,
} from "./model"
export {
  scoreToSegment,
  segmentToChannel,
  SEGMENTS,
  type Segment,
  type ChannelType,
} from "./segments"
