import { BAG_SIZE, bagImg } from '../config'

interface Props {
  /** 0 kuning, 1 biru, 2 ungu, 3 pink (Baggage.png) */
  index: number
  /** lebar tampil (px) */
  width: number
}

export const bagHeight = (index: number, width: number) => (width * BAG_SIZE[index][1]) / BAG_SIZE[index][0]

/**
 * Koper dari Baggage.png dengan shadow lembut: bayangan elips di bawah roda (gradien radial, tepi memudar) dan
 * drop-shadow tipis berbaur di sekeliling badan koper supaya terlihat berdimensi. Nilainya dibagi dengan Gasing lewat variabel --soft-shadow-* di :root (src/index.css).
 */
export function Baggage({ index, width }: Props) {
  const h = bagHeight(index, width)
  return (
    <div className="bag" style={{ width, height: h, ['--sw' as string]: `${width}px`, ['--sh' as string]: `${h}px` }}>
      <i className="bag-shadow" aria-hidden />
      <img className="bag-img" src={bagImg(index)} alt="" draggable={false} style={{ width, height: h }} />
    </div>
  )
}
