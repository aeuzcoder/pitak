import { create } from "zustand";
import type { Tariff, SeatOption, GenderPref } from "../types";

export type OrderTab = "taxi" | "delivery";
export type DeliveryPayer = "sender" | "receiver";

interface OrderState {
  tab: OrderTab;
  fromRegion: string;
  fromDistrict: string;
  toRegion: string;
  toDistrict: string;
  tariff: Tariff;
  seatOption: SeatOption;
  genderPref: GenderPref;
  comment: string;
  deliveryReceiver: string;
  deliveryComment: string;
  deliveryRoofRack: boolean;
  deliveryPayer: DeliveryPayer;
  deliveryPrice: number;
  /** Xarita markazi (bosh sahifa) — Toshkent bbox tekshiruvi uchun */
  pickupLat: number | null;
  pickupLng: number | null;
  /** `datetime-local` qiymati (YYYY-MM-DDTHH:mm) */
  departureTime: string;
  setPickupCoords: (lat: number, lng: number) => void;
  setDepartureTime: (v: string) => void;
  setTab: (tab: OrderTab) => void;
  setFrom: (region: string, district: string) => void;
  setTo: (region: string, district: string) => void;
  setTariff: (tariff: Tariff) => void;
  setSeatOption: (option: SeatOption) => void;
  setGenderPref: (pref: GenderPref) => void;
  setComment: (comment: string) => void;
  setDeliveryReceiver: (receiver: string) => void;
  setDeliveryComment: (comment: string) => void;
  setDeliveryRoofRack: (v: boolean) => void;
  setDeliveryPayer: (payer: DeliveryPayer) => void;
  setDeliveryPrice: (price: number) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  tab: "taxi",
  fromRegion: "",
  fromDistrict: "",
  toRegion: "",
  toDistrict: "",
  tariff: "econom",
  seatOption: "seat1",
  genderPref: "any",
  comment: "",
  deliveryReceiver: "",
  deliveryComment: "",
  deliveryRoofRack: false,
  deliveryPayer: "receiver",
  deliveryPrice: 60000,
  pickupLat: null,
  pickupLng: null,
  departureTime: "",

  setPickupCoords: (lat, lng) => set({ pickupLat: lat, pickupLng: lng }),
  setDepartureTime: (departureTime) => set({ departureTime }),
  setTab: (tab) => set({ tab }),
  setFrom: (region, district) => set({ fromRegion: region, fromDistrict: district }),
  setTo: (region, district) => set({ toRegion: region, toDistrict: district }),
  setTariff: (tariff) => set({ tariff }),
  setSeatOption: (option) => set({ seatOption: option }),
  setGenderPref: (pref) => set({ genderPref: pref }),
  setComment: (comment) => set({ comment }),
  setDeliveryReceiver: (receiver) => set({ deliveryReceiver: receiver }),
  setDeliveryComment: (comment) => set({ deliveryComment: comment }),
  setDeliveryRoofRack: (v) => set({ deliveryRoofRack: v }),
  setDeliveryPayer: (payer) => set({ deliveryPayer: payer }),
  setDeliveryPrice: (price) => set({ deliveryPrice: price }),
  reset: () =>
    set({
      tab: "taxi",
      fromRegion: "",
      fromDistrict: "",
      toRegion: "",
      toDistrict: "",
      tariff: "econom",
      seatOption: "seat1",
      genderPref: "any",
      comment: "",
      deliveryReceiver: "",
      deliveryComment: "",
      deliveryRoofRack: false,
      deliveryPayer: "receiver",
      deliveryPrice: 60000,
      pickupLat: null,
      pickupLng: null,
      departureTime: "",
    }),
}));
