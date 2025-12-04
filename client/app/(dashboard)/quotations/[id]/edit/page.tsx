"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

export default function EditQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const [formData, setFormData] = useState({
    reference: `QUO-${String(params.id).padStart(5, "0")}`,
    date: "2024-01-15",
    validUntil: "2024-02-15",
    customer: "Acme Corporation",
    status: "sent",
    notes: "Special corporate pricing applied. Free shipping included.",
    terms: "Payment due within 30 days of invoice date.",
  })

  const [items, setItems] = useState([
    { id: 1, product: "Laptop Dell XPS 15", quantity: 10, unitPrice: 1500, tax: 10 },
    { id: 2, product: "Wireless Mouse", quantity: 10, unitPrice: 30, tax: 10 },
  ])

  const [discount, setDiscount] = useState(500)

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: "", quantity: 1, unitPrice: 0, tax: 0 }])
  }

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.tax) / 100, 0)
    return subtotal + tax - discount
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Quotation</h1>
          <p className="text-muted-foreground">Update quotation details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" value={formData.reference} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={formData.customer}
                onValueChange={(value) => setFormData({ ...formData, customer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Acme Corporation">Acme Corporation</SelectItem>
                  <SelectItem value="Tech Solutions Inc">Tech Solutions Inc</SelectItem>
                  <SelectItem value="Global Enterprises">Global Enterprises</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 items-end p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Label>Product</Label>
                <Input placeholder="Select product" value={item.product} />
              </div>
              <div className="w-24 space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={item.quantity} />
              </div>
              <div className="w-32 space-y-2">
                <Label>Unit Price</Label>
                <Input type="number" value={item.unitPrice} />
              </div>
              <div className="w-24 space-y-2">
                <Label>Tax %</Label>
                <Input type="number" value={item.tax} />
              </div>
              <div className="w-32 space-y-2">
                <Label>Subtotal</Label>
                <Input value={`$${(item.quantity * item.unitPrice * (1 + item.tax / 100)).toFixed(2)}`} disabled />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between items-center">
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-32"
                />
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={() => router.push("/quotations")}>Save Changes</Button>
      </div>
    </div>
  )
}
