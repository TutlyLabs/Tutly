"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Styles, UserOptions } from "jspdf-autotable";
import { type ChangeEvent, useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import day from "@/lib/dayjs";

import type { Course } from "@prisma/client";
import NoDataFound from "@/components/NoDataFound";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}

export interface DataItem {
  username: string;
  name: string | null;
  submissionLength: number;
  assignmentLength: number;
  score: number;
  submissionEvaluatedLength: number;
  attendance: string;
  mentorUsername: string | null;
}

const Report = ({
  isMentor = false,
  allCourses = [],
  courseId,
}: {
  isMentor?: boolean;
  allCourses?: (Course | null)[];
  courseId: string;
}) => {
  const { data: reportData } = api.report.generateReport.useQuery({ courseId });
  const [data, setData] = useState<DataItem[]>([]);

  useEffect(() => {
    if (reportData) {
      const sortedData =
        reportData.data?.sort((a, b) => a.username.localeCompare(b.username)) ||
        [];
      setData(sortedData);
    }
  }, [reportData]);

  const [sortColumn, setSortColumn] = useState<string>("submissionLength");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      Username: true,
      Name: true,
      Assignments: true,
      Submissions: true,
      Evaluated: true,
      Score: true,
      Attendance: true,
      Mentor: !isMentor,
    },
  );

  const isAllView = courseId === "all";
  const currentCourse = allCourses.find((course) => course?.id === courseId);

  const uniqueMentors = Array.from(
    new Set(data.map((item) => item.mentorUsername)),
  );

  const columnMapping: Record<string, keyof DataItem> = {
    Username: "username",
    Name: "name",
    Submissions: "submissionLength",
    Assignments: "assignmentLength",
    Score: "score",
    Evaluated: "submissionEvaluatedLength",
    Attendance: "attendance",
    Mentor: "mentorUsername",
  };

  const handleSort = (column: string) => {
    const key = columnMapping[column] || "username";
    if (!key) return;

    const order = sortColumn === key && sortOrder === "asc" ? "desc" : "asc";
    const sortedData = [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
    setSortColumn(key);
    setSortOrder(order);
    setData(sortedData);
  };

  const handleMentorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMentor(e.target.value);
  };

  const handleFormatChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const filteredData = selectedMentor
    ? data.filter((item) => item.mentorUsername === selectedMentor)
    : data;

  const downloadCSV = () => {
    const headers = Object.keys(columnMapping);
    const rows = filteredData.map((item) =>
      headers.map((header) => {
        const key = columnMapping[header] || "username";
        const value = item[key];
        if (value === null) return "";
        if (key === "attendance") {
          return formatAttendance(value);
        }
        return value.toString();
      }),
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const formattedDate = day().format("ddd DD MMM, YYYY hh:mm A");
    link.setAttribute("download", `${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const formattedDate = day().format("ddd DD MMM, YYYY hh:mm A");
    const title = `Report - ${currentCourse?.title || "All Courses"} - ${formattedDate}`;
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;

    doc.text(title, titleX, 10);

    const visibleHeaders = [
      "S.No",
      ...Object.keys(columnMapping)
        .filter((column) => visibleColumns[column])
        .map((column) => column),
    ];

    const tableData = filteredData.map((item, index) => [
      index + 1,
      ...Object.entries(columnMapping)
        .filter(([column]) => visibleColumns[column])
        .map(([column, key]) => {
          if (column === "Attendance") {
            return formatAttendance(item[key]);
          }
          return item[key];
        }),
    ]);

    const sideMargin = 5;
    const availableWidth = pageWidth - 2 * sideMargin;

    const columnRatios: Record<string, number> = {
      "S.No": 0.5,
      Name: 2,
      Username: 1.2,
      Mentor: 1.2,
      Submissions: 0.8,
      Assignments: 0.8,
      Score: 0.8,
      Evaluated: 0.8,
      Attendance: 0.8,
    };

    const totalRatio = visibleHeaders.reduce(
      (sum, header) => sum + (columnRatios[header] || 1),
      0,
    );
    const unitWidth = availableWidth / totalRatio;

    const columnWidths = visibleHeaders.map(
      (header) => (columnRatios[header] || 1) * unitWidth,
    );

    const columnStyles: { [key: string]: Partial<Styles> } = {};
    visibleHeaders.forEach((_, index) => {
      if (columnWidths[index] !== undefined) {
        columnStyles[index] = {
          cellWidth: columnWidths[index],
          overflow: "linebreak" as const,
        };
      }
    });

    doc.autoTable({
      head: [visibleHeaders],
      body: tableData,
      startY: 20,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak" as const,
        halign: "center" as const,
        valign: "middle" as const,
        lineWidth: 0.1,
        minCellHeight: 8,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center" as const,
        cellPadding: 3,
      },
      columnStyles,
      margin: {
        left: sideMargin,
        right: sideMargin,
        top: 20,
        bottom: 15,
      },
      didDrawPage: (data: { pageNumber: number }) => {
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber}`, sideMargin, pageHeight - 10);
      },
    });

    doc.save(`Report-${formattedDate}.pdf`);
  };

  const handleDownload = () => {
    if (selectedFormat === "csv") {
      downloadCSV();
    } else if (selectedFormat === "pdf") {
      downloadPDF();
    }
  };

  const formatAttendance = (attendance: string | number | null): string => {
    if (attendance === null) return "N/A";
    const attendanceNumber =
      typeof attendance === "string" ? parseFloat(attendance) : attendance;
    if (isNaN(attendanceNumber)) {
      return "N/A";
    }
    return attendanceNumber.toFixed(2) + "%";
  };

  return (
    <div className="flex w-full flex-col">
      {/* Course navigation bar - horizontally scrollable on small screens */}
      <div className="w-full overflow-x-auto bg-white px-2 py-3 sm:px-6 dark:bg-gray-800">
        <div className="flex min-w-max items-center gap-2">
          <Link
            href="/tutor/report/all"
            className={`rounded px-2 py-1.5 text-sm whitespace-nowrap ${
              isAllView
                ? "border border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            All Courses
          </Link>
          {allCourses?.map(
            (course: any) =>
              course.isPublished === true && (
                <Link
                  href={`/tutor/report/${course.id}`}
                  className={`rounded px-2 py-1.5 text-sm whitespace-nowrap ${
                    !isAllView && currentCourse?.id === course?.id
                      ? "border border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  key={course?.id}
                >
                  <h1 className="max-w-[140px] truncate font-medium sm:max-w-xs">
                    {course.title}
                  </h1>
                </Link>
              ),
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div>
          <div>
            <p className="mt-20 mb-5 flex items-center justify-center text-xl font-semibold">
              No data available to generate report!
            </p>
            <NoDataFound message="No data available to generate report!" />
          </div>
        </div>
      ) : (
        <div className="w-full p-2 sm:p-4 md:p-6">
          <div className="relative overflow-x-auto border shadow-md sm:rounded-lg dark:border-gray-700">
            {/* Filter and control section */}
            <div className="flex flex-col gap-3 border-b bg-white p-3 sm:flex-row sm:justify-between dark:border-gray-700 dark:bg-gray-800">
              {/* Mentor filter */}
              {isMentor ? (
                <div className="flex items-center text-sm dark:text-gray-200">
                  <span className="mr-2 font-medium">Mentor:</span>
                  <div className="rounded-lg border p-1.5 dark:border-gray-600">
                    {uniqueMentors.map((mentor) => (
                      <span key={mentor}>{mentor}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full sm:w-auto">
                  <select
                    id="mentor-select"
                    title="mentor name"
                    value={selectedMentor}
                    onChange={handleMentorChange}
                    className="w-full rounded-lg border bg-white p-1.5 text-sm sm:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="">All Mentors</option>
                    {uniqueMentors.map((mentor) => (
                      <option key={mentor} value={mentor ?? ""}>
                        {mentor ?? "No Mentor"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Export controls */}
              <div className="xs:flex-row flex flex-col gap-2 sm:items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger className="xs:w-auto w-full rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                    View Columns
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="dark:border-gray-700 dark:bg-gray-800"
                  >
                    {Object.keys(visibleColumns)
                      .filter((col) => col !== "Mentor" || !isMentor)
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column}
                          checked={visibleColumns[column]}
                          onCheckedChange={(checked: boolean) =>
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [column]: checked,
                            }))
                          }
                          className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                        >
                          {column}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="xs:w-auto flex w-full">
                  <select
                    id="format-select"
                    title="select format"
                    value={selectedFormat}
                    onChange={handleFormatChange}
                    className="xs:flex-none flex-1 rounded-l-lg border bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                  </select>
                  <button
                    onClick={handleDownload}
                    className="rounded-r-lg bg-blue-500 px-3 py-1.5 text-sm whitespace-nowrap text-white hover:bg-blue-600"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>

            {/* Table section */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm dark:text-gray-200">
                <thead className="bg-blue-500 text-xs text-white uppercase">
                  <tr>
                    <th className="cursor-pointer truncate border-b border-blue-600 px-3 py-2 sm:px-4 sm:py-3">
                      S.No
                    </th>
                    {Object.keys(columnMapping).map(
                      (column) =>
                        visibleColumns[column] && (
                          <th
                            key={column}
                            onClick={() => handleSort(column)}
                            className="cursor-pointer truncate border-b border-blue-600 px-3 py-2 sm:px-4 sm:py-3"
                          >
                            {column}
                            {sortColumn === columnMapping[column] &&
                              (sortOrder === "asc" ? " ↑" : " ↓")}
                          </th>
                        ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr
                      key={index}
                      className={`${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50 dark:bg-gray-700"
                      } hover:bg-gray-100 dark:hover:bg-gray-600`}
                    >
                      <td className="border-b border-gray-300 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-700">
                        {index + 1}
                      </td>
                      {Object.entries(columnMapping).map(
                        ([column, key]) =>
                          visibleColumns[column] && (
                            <td
                              key={column}
                              className="border-b border-gray-300 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-700"
                            >
                              {column === "Attendance"
                                ? formatAttendance(row[key])
                                : row[key]}
                            </td>
                          ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
