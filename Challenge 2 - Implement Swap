//swapping the values that are passed to this function
var swap = function(array, firstIndex, secondIndex) {
	var temp = array[firstIndex];
	array[firstIndex] = array[secondIndex];
	array[secondIndex] = temp;
};

//declaring testArray and assigning it numbers
var testArray = [7, 9, 4];

//first test
swap(testArray, 0, 1);
println(testArray);
Program.assertEqual(testArray, [9, 7, 4]);

//second test
swap(testArray, 0, 2);
println(testArray);
Program.assertEqual(testArray, [4, 7, 9]);

//third test
swap(testArray, 1, 2);
println(testArray);
Program.assertEqual(testArray, [4, 9, 7]);

