-- CreateTable
CREATE TABLE "DrawingStroke" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "points" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DrawingStroke_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DrawingStroke" ADD CONSTRAINT "DrawingStroke_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingStroke" ADD CONSTRAINT "DrawingStroke_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
