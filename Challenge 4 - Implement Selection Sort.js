//this function swaps the two values 
var swap = function(array, firstIndex, secondIndex) {
    var temp = array[firstIndex];
    array[firstIndex] = array[secondIndex];
    array[secondIndex] = temp;
};

//this function checks to see if there is smaller value in the array
var indexOfMinimum = function(array, startIndex) {

    var minValue = array[startIndex];
    var minIndex = startIndex;

    for(var i = minIndex + 1; i < array.length; i++) {
        if(array[i] < minValue) {
            minIndex = i;
            minValue = array[i];
        }
    } 
    return minIndex;
}; 

//this function contains the loop that checks all positions in the array and sends the values to the other functions
var selectionSort = function(array) {
    var minimum;
    for (var i=0; i<array.length; i++){
        minimum = indexOfMinimum(array, i);
        swap(array, i, minimum);
    }
};

//declaring first array
var array = [22, 11, 99, 88, 9, 7, 42];
//calling selectionSort function
selectionSort(array);
//checking that the numbers were sorted correctly
println("Array after sorting:  " + array);
Program.assertEqual(array, [7, 9, 11, 22, 42, 88, 99]);

//declaring second array
var array1 = [26, 4, 0, -23, 56, 8, 40];
//calling selectionSort function
selectionSort(array1);
//checking that the numbers were sorted correctly
println("Array1 after sorting: " + array1);
Program.assertEqual(array1, [-23, 0, 4, 8, 26, 40, 56]);
