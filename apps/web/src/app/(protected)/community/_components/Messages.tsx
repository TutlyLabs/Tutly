"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaCrown } from "react-icons/fa";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { LuReply, LuSendHorizontal, LuMessageCircleMore } from "react-icons/lu";
import { MdDelete } from "react-icons/md";
import { PiCrownSimpleFill } from "react-icons/pi";
import { RxCross2 } from "react-icons/rx";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SessionUser } from "@tutly/auth";
import { api } from "@/trpc/react";

interface Doubt {
  id: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    image?: string;
  };
  response: Response[];
}

interface Response {
  id: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    image?: string;
  };
}

interface MessagesProps {
  doubts: Doubt[];
  currentUser: SessionUser;
  currentCourseId: string;
}

export default function Messages({ doubts, currentUser, currentCourseId }: MessagesProps) {
  const [openAccordion, setOpenAccordion] = useState<number>(0);
  const [show, setShow] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [reply, setReply] = useState<string>("");
  const [replyId, setReplyId] = useState<string>("");

  const utils = api.useUtils();

  const createDoubt = api.doubts.createDoubt.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Doubt added successfully");
      setMessage("");
    },
    onError: () => {
      toast.error("Failed to add doubt");
    },
  });

  const createResponse = api.doubts.createResponse.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Reply added successfully");
      setReply("");
      setReplyId("");
    },
    onError: () => {
      toast.error("Failed to add reply");
    },
  });

  const deleteDoubt = api.doubts.deleteDoubt.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Doubt deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete doubt");
    },
  });

  const deleteResponse = api.doubts.deleteResponse.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Reply deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete reply");
    },
  });

  const handleAddDoubt = async (data: { message: string }) => {
    await createDoubt.mutateAsync({
      courseId: currentCourseId,
      title: "",
      description: data.message,
    });
  };

  const handleReply = async (id: string) => {
    if (!reply) return;

    await createResponse.mutateAsync({
      doubtId: id,
      description: reply,
    });
  };

  const handleDeleteDoubt = async (id: string) => {
    await deleteDoubt.mutateAsync({
      doubtId: id,
    });
  };

  const handleDeleteReply = async (replyId: string) => {
    await deleteResponse.mutateAsync({
      responseId: replyId,
    });
  };

  const handleCtrlEnterDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      void handleSubmit(e);
    }
  };

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? -1 : index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShow(false);
    const data = {
      message: message,
    };
    if (!data.message) {
      toast.error("Please enter a message");
      return;
    }
    await handleAddDoubt(data);
    setShow(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setMessage(e.target.value);
  };

  function formatDateTime(dateTimeString: string) {
    const dateTime = new Date(dateTimeString);

    const day = dateTime.getDate().toString().padStart(2, "0");
    const month = (dateTime.getMonth() + 1).toString().padStart(2, "0");
    const year = dateTime.getFullYear().toString().slice(-2);

    let hour = dateTime.getHours();
    const minute = dateTime.getMinutes().toString().padStart(2, "0");
    const ampm = hour >= 12 ? "pm" : "am";
    hour = hour % 12 || 12;

    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${hour}:${minute} ${ampm}`;

    return `${formattedDate} , ${formattedTime}`;
  }

  const addDoubtRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto md:min-w-[800px]">
      <div className="flex flex-col items-center text-sm font-medium space-y-4">
        <div className="flex w-full justify-center mb-4 sticky top-0 z-10 py-2">
          <AlertDialog open={show} onOpenChange={setShow}>
            <AlertDialogTrigger className="w-full sm:w-auto">
              <Button className=" rounded-md px-4 py-3 text-white bg-gray-500 hover:bg-gray-600">
                {currentUser.role === "STUDENT" ? "Ask a Doubt" : "Raise a Query"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Share Your Queries Here</AlertDialogTitle>
                <AlertDialogDescription>
                  <Textarea
                    ref={addDoubtRef}
                    id="message"
                    placeholder="Start typing your doubt here..."
                    onChange={handleChange}
                    onKeyDown={handleCtrlEnterDown}
                    rows={4}
                    value={message}
                    className="w-full resize-none font-semibold p-3 text-gray-300 border border-gray-300 my-2 rounded-md
  focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {doubts?.length !== 0 && (
        <Card
          id="accordion-color"
          data-accordion="collapse"
          className="text-gray-700 mt-5 cursor-pointer w-full space-y-4"
        >
          {doubts?.map((qa, index) => (
            <div
              key={index}
              className={`relative p-4 bg-white transition-shadow duration-300 ease-in-out bg-white rounded-md ${openAccordion === index ? "shadow-xl" : "shadow-md"
                }w-full`}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4 p-2">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {qa.user.role === "STUDENT" && (
                    <Image
                      src={qa.user?.image || "/placeholder.jpg"}
                      alt="profile"
                      width={40}
                      height={40}
                      className="rounded-full shadow-lg shadow-fuchsia-500/50 ring ring-fuchsia-600 ring-offset-1"
                    />
                  )}
                  {qa.user.role === "MENTOR" && (
                    <div className="relative">
                      <FaCrown className="absolute -left-3 -top-3 -rotate-45 text-yellow-400 shadow-yellow-500 drop-shadow-sm hover:text-yellow-500" />
                      <Image
                        src={qa.user?.image || "/placeholder.jpg"}
                        alt="profile"
                        width={40}
                        height={40}
                        className="rounded-full shadow-lg shadow-yellow-400/50"
                      />
                    </div>
                  )}
                  {qa.user.role === "INSTRUCTOR" && (
                    <div className="relative">
                      <FaCrown className="absolute -left-3 -top-3 -rotate-45 text-red-500 shadow-red-500 drop-shadow-sm hover:text-red-600" />
                      <Image
                        src={qa.user?.image || "/placeholder.jpg"}
                        alt="profile"
                        width={40}
                        height={40}
                        className="rounded-full shadow-lg shadow-red-400/50"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-start gap-1">
                    <div className="flex flex-row justify-end items-center gap-3 flex-wrap">
                      <p className="text-xs font-semibold truncate max-w-[150px] sm:max-w-xs">{qa?.user?.name} </p>
                      <p className="text-xs test-gray-500 font-medium"> [ {qa.user?.username} ]</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">
                        Posted on {formatDateTime(qa?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex text-sm items-center justify-end p-2 gap-4">
                  <div onClick={() => toggleAccordion(index)} className="text-sm font-medium">
                    <div className="flex items-center gap-2 p-1">
                      <LuMessageCircleMore className="h-5 w-5" />
                      <h1>{qa.response.length} replies</h1>
                    </div>
                  </div>
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <HiOutlineDotsHorizontal className="text-gray-800" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="mt-2">
                        <DropdownMenuItem onSelect={() => setReplyId(qa.id)}>
                          <LuReply className="mr-2 h-4 w-4" />
                          <span>Reply</span>
                        </DropdownMenuItem>
                        {(currentUser.role === "INSTRUCTOR" ||
                          (currentUser.role === "MENTOR" && qa.user.id === currentUser.id)) && (
                            <DropdownMenuItem>
                              <MdDelete className="mr-2 h-4 w-4" />
                              <AlertDialogTrigger>Delete</AlertDialogTrigger>
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDoubt(qa.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="px-5">
                <h1 className="font-semibold text-lg">{qa.description}</h1>
              </div>

              {openAccordion === index && qa.response.length === 0 && (
                <div className="m-2 flex items-center justify-center space-x-2 rounded-lg bg-secondary-200 p-3 hover:bg-secondary-300">
                  <p className="text-medium flex items-center justify-start font-bold">
                    No responses
                  </p>
                </div>
              )}

              <div className="m-2 flex items-center">
                {replyId === qa?.id && (
                  <div className="w-full m-2 flex items-center gap-3">
                    <Input
                      placeholder="Enter your reply"
                      value={reply}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) {
                          void handleReply(replyId);
                        }
                        if (e.key === "Escape") {
                          setReplyId("");
                        }
                      }}
                      onChange={(e) => setReply(e.target.value)}
                      className="flex-grow"
                    />
                    <Button onClick={() => setReplyId("")} variant="outline" size="icon">
                      <RxCross2 className="h-4 w-4 text-white" />
                    </Button>
                    <Button onClick={() => void handleReply(qa.id)} variant="outline" size="icon">
                      <LuSendHorizontal className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
              </div>

              {openAccordion === index && qa?.response.length > 0 && (
                <div className="rounded-lg p-3">
                  {qa?.response.map((r, responseIndex) => (
                    <div key={responseIndex} className="mb-2 rounded-lg p-5 bg-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-5">
                          {r.user?.role === "STUDENT" && (
                            <Image
                              src={r.user?.image || "/placeholder.jpg"}
                              alt="profile"
                              width={40}
                              height={40}
                              className="rounded-full shadow-lg shadow-fuchsia-500/50 ring ring-fuchsia-600 ring-offset-1"
                            />
                          )}
                          {r.user?.role === "MENTOR" && (
                            <div className="relative">
                              <FaCrown className="absolute -left-3 -top-3 -rotate-45 text-yellow-400 shadow-yellow-500 drop-shadow-sm hover:text-yellow-500" />
                              <Image
                                src={r.user?.image || "/placeholder.jpg"}
                                alt="profile"
                                width={40}
                                height={40}
                                className="rounded-full shadow-lg shadow-yellow-400/50"
                              />
                            </div>
                          )}
                          {r.user?.role === "INSTRUCTOR" && (
                            <div className="relative">
                              <PiCrownSimpleFill className="absolute -left-3 -top-3 -rotate-45 text-red-400 shadow-red-500 drop-shadow-sm hover:text-red-500" />
                              <Image
                                src={r.user?.image || "/placeholder.jpg"}
                                alt="profile"
                                width={40}
                                height={40}
                                className="rounded-full shadow-lg shadow-red-400/50"
                              />
                            </div>
                          )}
                          <div className="flex flex-col justify-start gap-1">
                            <div className="flex flex-row justify-start gap-3">
                              <p className="text-xs font-semibold">{r?.user?.name} </p>
                              <p className="text-xs font-medium"> [ {r?.user?.username} ]</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium">
                                Posted on {formatDateTime(r?.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div hidden={r.user.role === "INSTRUCTOR" && currentUser.role !== "INSTRUCTOR"}>
                          {(currentUser.role === "MENTOR" || currentUser.role === "INSTRUCTOR") && (
                            <AlertDialog>
                              <AlertDialogTrigger>
                                <MdDelete className="h-5 w-5 cursor-pointer text-red-600" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    reply.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteReply(r.id)}>
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      <div className="-mb-2 mt-4 text-sm font-semibold">{r.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
