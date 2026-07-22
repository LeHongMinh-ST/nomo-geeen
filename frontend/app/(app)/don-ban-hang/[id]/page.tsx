"use client";
import { use } from "react";
import { OrderDetail } from "@/components/app/sales/order-detail";
export default function Page({params}:{params:Promise<{id:string}>}){return <OrderDetail id={use(params).id}/>}
