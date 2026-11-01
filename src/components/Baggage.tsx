import { BAG_SIZE, bagImg } from '../config'

interface Props {
  /** 0 kuning, 1 biru, 2 ungu, 3 pink (Baggage.png) */
  index: number
  /** lebar tampil (px) */
  width: number
}

export const bagHeight = (index: number, width: number) => (width * BAG_SIZE[index][1]) / BAG_SIZE[index][0]

/** Koper dari Baggage.png */
export function Baggage({ index, width }: Props) {
  return <img src={bagImg(index)} alt="" draggable={false} style={{ width, height: bagHeight(index, width), display: 'block' }} />
}
