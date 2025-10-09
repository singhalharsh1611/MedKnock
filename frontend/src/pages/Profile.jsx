import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import QRCode from "react-qr-code";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function ProfilePage() {
  const { user, token, setUser } = useAuth();
  const location = useLocation();
  const [photoUploading, setPhotoUploading] = useState(false);
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
    emergencyPhone: "",
  });
  const [isEditing, setIsEditing] = useState(false); // Edit mode
  const [isFirstTime, setIsFirstTime] = useState(false); // First-time profile completion

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get("calendar_connected");
    const error = params.get("calendar_error");

    if (connected) {
      toast.success("Google Calendar connected!");
      // Update local state
      setFormData((prev) => ({ ...prev, isGoogleConnected: true }));
      window.history.replaceState({}, "", "/profile"); // clean URL
    }

    if (error) {
      toast.error("Google Calendar connection failed: " + error);
      window.history.replaceState({}, "", "/profile");
    }
  }, [location]);


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/v1/user/${user.userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const userData = data.data || data;

        const initialData = {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          age: userData.age || "",
          gender: userData.gender || "",
          phone: userData.phone || "",
          photo: userData.photo || "",
          street: userData.address?.street || "",
          city: userData.address?.city || "",
          state: userData.address?.state || "",
          zip: userData.address?.zip || "",
          country: userData.address?.country || "",
          bloodGroup: userData.bloodGroup || "",
          allergies: userData.allergies?.join(", ") || "",
          medicalConditions: userData.medicalConditions?.join(", ") || "",
          emergencyName: userData.emergencyContact?.name || "",
          emergencyPhone: userData.emergencyContact?.phone || "",
          isGoogleConnected: userData.isGoogleConnected || false,
        };

        setFormData(initialData);

        // Detect first-time (incomplete profile)
        if (!userData.age || !userData.gender || !userData.phone) {
          setIsFirstTime(true);
          setIsEditing(true);
        } else {
          setIsFirstTime(false);
          setIsEditing(false);
        }
      } catch (err) {
        console.error("Error fetching user: ", err);
        toast.error("Failed to fetch user data");
      }
    };

    if (user && token) fetchUser();
  }, [user, token]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        gender: formData.gender,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
        },
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies.split(",").map((a) => a.trim()),
        medicalConditions: formData.medicalConditions
          .split(",")
          .map((a) => a.trim()),
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
        },
      };

      const response = await axios.patch(
        `${backendUrl}/api/v1/user/${user.userId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // console.log("Server response:", response.data);

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setIsFirstTime(false);

      setFormData((prev) => ({ ...prev, ...payload }));
    } catch (err) {
      console.error("Update error:", err.response || err);
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Profile Settings</h1>
      <p className="text-muted-foreground">
        Manage your personal and health information here.
      </p>

      <div className="flex flex-col md:flex-row gap-12">
        <div className="flex flex-col items-center w-full md:w-1/3">
          <img
            src={
              formData.photo ||
              "https://cdn.jsdelivr.net/gh/shadcn/ui/public/avatar.png"
            }
            alt="Profile"
            referrerPolicy="no-referrer"
            className="w-32 h-32 rounded-full object-cover border shadow-sm"
          />
          <Label className="mt-4">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="profilePhotoInput"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formDataFile = new FormData();
                formDataFile.append("file", file);

                try {
                  setPhotoUploading(true);
                  const res = await axios.patch(
                    `${backendUrl}/api/v1/user/${user.userId}/photo`,
                    formDataFile,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                      },
                    }
                  );
                  handleChange("photo", res.data.photo);
                  user.userPhoto = res.data.photo;
                  toast.success("Profile photo updated!");
                  setUser((prev) => ({ ...prev, userPhoto: res.data.photo }));
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to upload photo");
                } finally {
                  setPhotoUploading(false);
                }
              }}
            />
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() =>
                document.getElementById("profilePhotoInput").click()
              }
              disabled={photoUploading}
            >
              {photoUploading ? "Uploading..." : "Change Photo"}
            </Button>
          </Label>
          <Button
            variant="default"
            className={`mt-8 text-white ${
              formData.isGoogleConnected
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={async () => {
              if (formData.isGoogleConnected) {
                try {
                  await axios.post(
                    `${backendUrl}/api/v1/user/google-calendar/disconnect`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  toast.success("Google Calendar disconnected!");
                  setFormData((prev) => ({
                    ...prev,
                    isGoogleConnected: false,
                  }));
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to disconnect Google Calendar");
                }
              } else {
                window.open(
                  `${backendUrl}/api/v1/user/google-calendar?token=${token}`,
                  "_blank"
                );
              }
            }}
          >
            {formData.isGoogleConnected
              ? "Disconnect Google Calendar"
              : "Connect Google Calendar"}
          </Button>

          {/* WhatsApp Reminders Signup */}
          <div className="mt-6 border-2 border-gray-500 rounded-xl p-4 text-center space-y-3 shadow-sm">
            <h3 className="text-lg font-semibold">Get WhatsApp Reminders</h3>
            <p className="text-sm text-muted-foreground">
              Click below or scan the QR code to join our WhatsApp reminders list.
            </p>

            <Button
              variant="outline"
              onClick={() => {
                window.open(
                  "https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+ice-plane&type=phone_number&app_absent=0",
                  "_blank"
                );
              }}
            >
              Sign up for WhatsApp Reminders
            </Button>

            <div className="mt-4 flex justify-center p-3 rounded-lg shadow-sm">
              <QRCode
                value="https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+ice-plane&type=phone_number&app_absent=0"
                size={150}
              />
            </div>
          </div>

        </div>



        {/* View Mode */}
        <div className="flex-1 w-full">
          {!isEditing && !isFirstTime ? (
            <Card className="p-6 space-y-4">
              <h2 className="text-3xl text-center font-semibold">
                Your Profile
              </h2>
              <p>
                <strong>Name:</strong> {formData.firstName} {formData.lastName}
              </p>
              <p>
                <strong>Age:</strong> {formData.age}
              </p>
              <p>
                <strong>Gender:</strong> {formData.gender}
              </p>
              <p>
                <strong>Phone:</strong> {formData.phone}
              </p>
              <p>
                <strong>Address:</strong> {formData.street}, {formData.city},{" "}
                {formData.state}, {formData.zip}, {formData.country}
              </p>
              <p>
                <strong>Blood Group:</strong> {formData.bloodGroup}
              </p>
              <p>
                <strong>Allergies:</strong> {formData.allergies}
              </p>
              <p>
                <strong>Medical Conditions:</strong>{" "}
                {formData.medicalConditions}
              </p>
              <p>
                <strong>Emergency Contact:</strong> {formData.emergencyName} (
                {formData.emergencyPhone})
              </p>

              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </Card>
          ) : (
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
                      onChange={(e) =>
                        handleChange("firstName", e.target.value)
                      }
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      placeholder="Doe"
                      required
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
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        handleChange("phone", value);
                      }}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Address Card */}
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
                  <div>
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
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                          (bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Allergies</Label>
                    <Input
                      placeholder="e.g. peanuts, penicillin"
                      value={formData.allergies}
                      onChange={(e) =>
                        handleChange("allergies", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Medical Conditions</Label>
                    <Input
                      placeholder="e.g. diabetes, hypertension"
                      value={formData.medicalConditions}
                      onChange={(e) =>
                        handleChange("medicalConditions", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleChange("emergencyName", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.emergencyPhone}
                      maxLength={10}
                      onChange={(e) => {
                        const value1 = e.target.value.replace(/\D/g, "");
                        handleChange("emergencyPhone", value1);
                      }}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div className="flex justify-end gap-4">
                {!isFirstTime && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit">
                  {isFirstTime ? "Complete Profile" : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
