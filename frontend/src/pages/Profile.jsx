import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

export default function ProfilePage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        age: "",
        gender: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        bloodGroup: "",
        allergies: "",
        medicalConditions: "",
        emergencyName: "",
        emergencyPhone: ""
    });

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        toast.success("Profile saved (not connected to backend yet)");
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Update your personal and health information here.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>First Name</Label>
                            <Input
                                value={formData.firstName}
                                onChange={(e) => handleChange("firstName", e.target.value)}
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <Label>Last Name</Label>
                            <Input
                                value={formData.lastName}
                                onChange={(e) => handleChange("lastName", e.target.value)}
                                placeholder="Doe"
                            />
                        </div>
                        <div>
                            <Label>Age</Label>
                            <Input
                                type="number"
                                value={formData.age}
                                onChange={(e) => handleChange("age", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>Gender</Label>
                            <Select
                                value={formData.gender}
                                onValueChange={(val) => handleChange("gender", val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:col-span-1">
                            <Label>Phone</Label>
                            <PhoneInput
                                defaultCountry="in"
                                value={formData.phone}
                                onChange={(val) => handleChange("phone", val)}
                                required
                                className="w-full"
                                inputClassName="w-full px-3 py-2 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                style={{
                                    '--react-international-phone-background-color': 'transparent',
                                    '--react-international-phone-border-color': 'hsl(var(--border))',
                                    '--react-international-phone-border-radius': '0.375rem',
                                    '--react-international-phone-height': '2.5rem',
                                    '--react-international-phone-text-color': 'hsl(var(--foreground))',
                                    '--react-international-phone-focus-border-color': 'hsl(var(--ring))',
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card>
                    <CardHeader>
                        <CardTitle>Address</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Street</Label>
                            <Input
                                value={formData.street}
                                onChange={(e) => handleChange("street", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>City</Label>
                            <Input
                                value={formData.city}
                                onChange={(e) => handleChange("city", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>State</Label>
                            <Input
                                value={formData.state}
                                onChange={(e) => handleChange("state", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>Zip</Label>
                            <Input
                                value={formData.zip}
                                onChange={(e) => handleChange("zip", e.target.value)}
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>Country</Label>
                            <Input
                                value={formData.country}
                                onChange={(e) => handleChange("country", e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Health Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Health Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Blood Group</Label>
                            <Select
                                value={formData.bloodGroup}
                                onValueChange={(val) => handleChange("bloodGroup", val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select blood group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Allergies</Label>
                            <Input
                                placeholder="e.g. peanuts, penicillin"
                                value={formData.allergies}
                                onChange={(e) => handleChange("allergies", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>Medical Conditions</Label>
                            <Input
                                placeholder="e.g. diabetes, hypertension"
                                value={formData.medicalConditions}
                                onChange={(e) => handleChange("medicalConditions", e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card>
                    <CardHeader>
                        <CardTitle>Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Name</Label>
                            <Input
                                value={formData.emergencyName}
                                onChange={(e) => handleChange("emergencyName", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <PhoneInput
                                defaultCountry="in"
                                value={formData.emergencyPhone}
                                onChange={(val) => handleChange("emergencyPhone", val)}
                                required
                                className="w-full"
                                inputClassName="w-full px-3 py-2 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                style={{
                                    '--react-international-phone-background-color': 'transparent',
                                    '--react-international-phone-border-color': 'hsl(var(--border))',
                                    '--react-international-phone-border-radius': '0.375rem',
                                    '--react-international-phone-height': '2.5rem',
                                    '--react-international-phone-text-color': 'hsl(var(--foreground))',
                                    '--react-international-phone-focus-border-color': 'hsl(var(--ring))',
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </div>
    );
}
