"use client";
import React, { useState } from "react";
import FirstSetup from "./FirstSetup";
import SecondSetup from "./SecondSetup";
import { useRouter } from "next/navigation";
import { UserInputs } from "@/lib/types";
import { CREATE_ORGANIZATION, GET_INDUSTRIES } from "@/lib/graphql";
import { useMutation, useQuery } from "@apollo/client";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useUploadThing } from "@/utils/uploadthing";

const AccountSetupForm = ({ email }: { email: string }) => {
  const [showSecondSetup, setShowSecondSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();
  const [organizationInput, { loading }] = useMutation(CREATE_ORGANIZATION);

  const { data: industriesData, loading: industriesLoading } = useQuery(
    GET_INDUSTRIES
  );

  const { startUpload, isUploading } = useUploadThing("logoUploader");

  const [userInputs, setUserInputs] = useState<UserInputs>({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    website: "",
    logo: "",
    employeeNo: "",
    industryId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInputs({ ...userInputs, [e.target.id]: e.target.value });
  };

  const handlePrevious = () => {
    setShowSecondSetup(false);
  };

  const handleNext = () => {
    if (
      !userInputs.address ||
      !userInputs.city ||
      !userInputs.state ||
      !userInputs.country ||
      !userInputs.zipCode ||
      !userInputs.name
    ) {
      setError("Please fill in all fields");
      return;
    }
    setError(null);
    setShowSecondSetup(true);
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 6 || isNaN(Number(e.target.value))) return;
    setUserInputs({ ...userInputs, zipCode: e.target.value });
  };

  const handleStateChange = (e: {
    id: number;
    name: string;
    country_id: number;
  }) => {
    setUserInputs({ ...userInputs, state: e.name });
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUserInputs({ ...userInputs, industryId: e.target.value });
  };

  const handleCountryChange = (e: {
    id: number;
    name: string;
    country_id: number;
  }) => {
    setCountryId(e.id);
    setUserInputs({ ...userInputs, country: e.name });
  };

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement & { files: FileList }>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewURL = URL.createObjectURL(file);
    setLogoPreview(previewURL);

    let formattedName = file.name;
    if (file.name.length > 20) {
      formattedName = file.name.slice(0, 10) + "...";
    }
    setFileName(formattedName);

    try {
      const uploaded = await startUpload([file]);
      if (uploaded && uploaded[0]?.url) {
        setUserInputs((prev) => ({
          ...prev,
          logo: uploaded[0].url,
        }));
        toast.success("Logo uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload error");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInputs.employeeNo || !userInputs.logo) {
      setError("Please fill in all fields");
      return;
    }

    const parts = userInputs.employeeNo.split("-");
    const numberOfUsers = parseInt(parts[1], 10);
    const zipCode = parseFloat(userInputs.zipCode);

    if (!userInputs.industryId) {
      setError("Please select an industry");
      return;
    }

    try {
      const { data } = await organizationInput({
        variables: {
          input: {
            address: userInputs.address,
            city: userInputs.city,
            country: userInputs.country,
            email,
            industryId: userInputs.industryId,
            logo: userInputs.logo,
            name: userInputs.name,
            numberOfUsers,
            state: userInputs.state,
            websiteUrl: userInputs.website,
            zipCode,
          },
        },
      });

      Cookies.set("organizationId", data.createOrganization._id, {
        expires: 7,
      });
      Cookies.set("logo", data.createOrganization.logo, {
        expires: 7,
      });

      toast.success("Organization created successfully");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <form action="" className="mt-10" onSubmit={handleSubmit}>
      {showSecondSetup ? (
        <SecondSetup
          userInputs={userInputs}
          handleChange={handleChange}
          handlePrevious={handlePrevious}
          error={error}
          logoPreview={logoPreview}
          fileName={fileName}
          handleLogoChange={handleLogoChange}
          isUploading={isUploading}
          loading={loading}
        />
      ) : (
        <FirstSetup
          userInputs={userInputs}
          handleChange={handleChange}
          handleNext={handleNext}
          error={error}
          handleCountryChange={handleCountryChange}
          handleStateChange={handleStateChange}
          countryId={countryId}
          handleZipCodeChange={handleZipCodeChange}
          handleIndustryChange={handleIndustryChange}
          industries={industriesData?.industries}
          industriesLoading={industriesLoading}
        />
      )}
    </form>
  );
};

export default AccountSetupForm;
